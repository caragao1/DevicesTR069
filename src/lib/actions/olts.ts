"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";
import { requireAdmin, requireSession } from "@/lib/session";
import { AgenteErro, chamarOlt, mensagemDeErro, obterCatalogo } from "@/lib/olt/agente";
import { coletarOlt } from "@/lib/olt/coleta";
import { errosPorCampo, lerDados } from "@/lib/olt/formulario";
import { isProtocolo } from "@/lib/olt/rotulos";
import type { Campo, Operacao, ResultadoExecucao } from "@/lib/olt/tipos";

// ---- Cadastro (somente Administrador: guarda credenciais de equipamentos) --

function parseOltForm(formData: FormData) {
  return {
    nome: String(formData.get("nome") ?? "").trim(),
    driver: String(formData.get("driver") ?? "").trim(),
    modelo: String(formData.get("modelo") ?? "").trim() || null,
    host: String(formData.get("host") ?? "").trim(),
    protocolo: String(formData.get("protocolo") ?? "ssh").trim(),
    porta: Number(formData.get("porta") ?? 0),
    usuario: String(formData.get("usuario") ?? "").trim(),
    senha: String(formData.get("senha") ?? ""),
    localizacao: String(formData.get("localizacao") ?? "").trim() || null,
    observacoes: String(formData.get("observacoes") ?? "").trim() || null,
    monitorar: formData.get("monitorar") === "on",
  };
}

function validarOlt(dados: ReturnType<typeof parseOltForm>, exigirSenha: boolean) {
  if (!dados.nome || !dados.driver || !dados.host || !dados.usuario) {
    return "Nome, driver, IP/hostname e usuário são obrigatórios.";
  }
  if (!isProtocolo(dados.protocolo)) return "Protocolo inválido.";
  if (!Number.isInteger(dados.porta) || dados.porta < 1 || dados.porta > 65535) {
    return "Porta deve ser um número entre 1 e 65535.";
  }
  if (!/^[A-Za-z0-9.\-:\[\]]+$/.test(dados.host)) return "IP ou hostname inválido.";
  if (exigirSenha && !dados.senha) return "Informe a senha de acesso à OLT.";
  return null;
}

export async function createOltAction(formData: FormData) {
  await requireAdmin();
  const dados = parseOltForm(formData);
  const erro = validarOlt(dados, true);
  if (erro) redirect(`/olts/new?error=${encodeURIComponent(erro)}`);
  if (await prisma.olt.findUnique({ where: { nome: dados.nome } })) {
    redirect(`/olts/new?error=${encodeURIComponent("Já existe uma OLT com esse nome.")}`);
  }
  const { senha, ...resto } = dados;
  const olt = await prisma.olt.create({ data: { ...resto, senhaEncrypted: encryptSecret(senha) } });
  redirect(`/olts/${olt.id}`);
}

export async function updateOltAction(id: string, formData: FormData) {
  await requireAdmin();
  const dados = parseOltForm(formData);
  const erro = validarOlt(dados, false);
  if (erro) redirect(`/olts/${id}/edit?error=${encodeURIComponent(erro)}`);
  const mesmoNome = await prisma.olt.findUnique({ where: { nome: dados.nome } });
  if (mesmoNome && mesmoNome.id !== id) {
    redirect(`/olts/${id}/edit?error=${encodeURIComponent("Já existe uma OLT com esse nome.")}`);
  }
  const { senha, ...resto } = dados;
  await prisma.olt.update({
    where: { id },
    // senha em branco na edição = manter a atual
    data: senha ? { ...resto, senhaEncrypted: encryptSecret(senha) } : resto,
  });
  redirect(`/olts/${id}`);
}

export async function deleteOltAction(id: string) {
  await requireAdmin();
  await prisma.olt.delete({ where: { id } });
  redirect("/olts");
}

// ---- Testar conexão e coletar (qualquer usuário logado) --------------------

export type MensagemState = { ok?: boolean; mensagem?: string };

async function oltOu404(id: string) {
  const olt = await prisma.olt.findUnique({ where: { id } });
  if (!olt) throw new AgenteErro("OLT não encontrada.", 404);
  return olt;
}

export async function testarOltAction(id: string): Promise<MensagemState> {
  await requireSession();
  try {
    const olt = await oltOu404(id);
    const resposta = await chamarOlt<{ mensagem: string }>(olt, "/testar");
    return { ok: true, mensagem: `Conexão OK (${olt.protocolo.toUpperCase()} ${olt.host}:${olt.porta}). ${resposta.mensagem}` };
  } catch (error) {
    return { ok: false, mensagem: `Falha na conexão: ${mensagemDeErro(error)}` };
  }
}

export async function coletarOltAction(id: string): Promise<MensagemState> {
  await requireSession();
  const olt = await prisma.olt.findUnique({ where: { id } });
  if (!olt) return { ok: false, mensagem: "OLT não encontrada." };
  const coleta = await coletarOlt(olt);
  revalidatePath("/olts", "layout");
  return coleta.sucesso
    ? { ok: true, mensagem: `Coleta concluída: ${coleta.online}/${coleta.total} ONUs online, ${coleta.sinalCritico} com sinal crítico.` }
    : { ok: false, mensagem: `Coleta falhou: ${coleta.erro}` };
}

// ---- Operações de escrita: prévia → confirmação → execução -----------------

export type OperacaoState =
  | { etapa: "form"; erros?: Record<string, string[]>; valores?: Record<string, unknown> }
  | {
      etapa: "previa";
      comandos: string[];
      operacao: string;
      naoHomologado: boolean;
      valores?: Record<string, unknown>;
    };

export type OperacaoBase = Omit<Operacao, "dados" | "comandos">;

async function exigirPermissao(acao: Operacao["acao"]) {
  // Script envia comandos livres, sem validação: só Administrador.
  return acao === "script" ? requireAdmin() : requireSession();
}

async function camposDaOperacao(driverChave: string, base: OperacaoBase): Promise<Campo[]> {
  if (base.acao !== "autorizar" && base.acao !== "criar") return [];
  const catalogo = await obterCatalogo();
  const driver = catalogo.drivers.find((d) => d.chave === driverChave);
  if (!driver) throw new AgenteErro(`O agente não conhece o driver "${driverChave}".`, 422);
  if (base.acao === "autorizar") return driver.schema_autorizacao;
  const recurso = driver.recursos.find((r) => r.chave === base.recurso);
  if (!recurso) throw new AgenteErro("Recurso não suportado por este modelo.", 422);
  return recurso.campos;
}

export async function prepararOperacaoAction(
  oltId: string,
  base: OperacaoBase,
  _prev: OperacaoState,
  formData: FormData
): Promise<OperacaoState> {
  await exigirPermissao(base.acao);
  let valores: Record<string, unknown> | undefined;
  try {
    const olt = await oltOu404(oltId);
    const operacao: Operacao = { ...base };
    if (base.acao === "script") {
      const texto = String(formData.get("comandos") ?? "");
      valores = { comandos: texto };
      operacao.comandos = texto.split(/\r?\n/);
    } else {
      const campos = await camposDaOperacao(olt.driver, base);
      if (campos.length) {
        valores = lerDados(campos, formData);
        operacao.dados = valores;
      }
    }
    const previa = await chamarOlt<{ comandos: string[]; operacao: Operacao; nao_homologado: boolean }>(olt, "/comandos", {
      operacao,
    });
    return {
      etapa: "previa",
      comandos: previa.comandos,
      operacao: JSON.stringify(previa.operacao),
      naoHomologado: previa.nao_homologado,
      valores,
    };
  } catch (error) {
    if (error instanceof AgenteErro && error.status === 422 && error.erros.length) {
      return { etapa: "form", erros: errosPorCampo(error.erros), valores };
    }
    return { etapa: "form", erros: { _geral: [mensagemDeErro(error)] }, valores };
  }
}

export type ExecucaoState = { erro?: string };

export async function executarOperacaoAction(
  oltId: string,
  voltar: string,
  _prev: ExecucaoState,
  formData: FormData
): Promise<ExecucaoState> {
  let operacao: Operacao;
  try {
    operacao = JSON.parse(String(formData.get("operacao") ?? ""));
  } catch {
    return { erro: "Operação inválida. Gere a prévia de novo." };
  }
  const session = await exigirPermissao(operacao.acao);
  const salvar = formData.get("salvar") === "on";

  let registroId: string;
  try {
    const olt = await oltOu404(oltId);
    const resultado = await chamarOlt<ResultadoExecucao>(olt, "/executar", { operacao, salvar });
    const registro = await prisma.oltOperacao.create({
      data: {
        oltId,
        userId: session.userId,
        acao: operacao.acao,
        recurso: operacao.recurso ?? (["autorizar", "desautorizar", "reiniciar"].includes(operacao.acao) ? "onu" : null),
        alvo: descreverAlvo(operacao),
        comandos: resultado.comandos.join("\n"),
        saidas: resultado.saidas.join("\n---\n") || null,
        sucesso: resultado.sucesso,
        erro: resultado.erro || null,
      },
    });
    registroId = registro.id;
  } catch (error) {
    // Falha antes de chegar à OLT (agente fora, validação): nada foi executado.
    return { erro: mensagemDeErro(error) };
  }
  revalidatePath(`/olts/${oltId}`, "layout");
  const destino = voltar.startsWith(`/olts/${oltId}`) ? voltar : `/olts/${oltId}`;
  redirect(`${destino}${destino.includes("?") ? "&" : "?"}resultado=${registroId}`);
}

function descreverAlvo(operacao: Operacao): string | null {
  const dados = (operacao.dados ?? {}) as Record<string, unknown>;
  switch (operacao.acao) {
    case "autorizar":
      return `${dados.pon}/${dados.onu_id} ${dados.sn ?? ""}`.trim();
    case "desautorizar":
    case "reiniciar":
      return `${operacao.pon}/${operacao.onu_id}`;
    case "criar":
      return `${dados.id ?? ""} ${dados.nome ?? ""}`.trim() || null;
    case "remover":
      return operacao.item_id ?? null;
    case "script":
      return (operacao.comandos ?? []).find((c) => c.trim())?.slice(0, 120) ?? null;
  }
}
