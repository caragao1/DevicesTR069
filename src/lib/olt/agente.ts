import "server-only";
import { decryptSecret } from "@/lib/crypto";
import type { Catalogo } from "@/lib/olt/tipos";

// Cliente HTTP do agente de OLTs (olt-agent/). O agente roda dentro da rede
// das OLTs e executa os comandos; esta aplicação só guarda cadastro e histórico.

const TIMEOUT_MS = 90_000; // coleta com leitura do Rx da OLT entra em cada PON
const CATALOGO_TTL_MS = 5 * 60_000;

export class AgenteErro extends Error {
  constructor(
    message: string,
    public status: number,
    public erros: string[] = []
  ) {
    super(message);
  }
}

type OltConexao = {
  driver: string;
  host: string;
  porta: number;
  protocolo: string;
  usuario: string;
  senhaEncrypted: string;
};

function configuracao() {
  const url = process.env.OLT_AGENT_URL || "http://127.0.0.1:8770";
  const token = process.env.OLT_AGENT_TOKEN;
  if (!token) {
    throw new AgenteErro("OLT_AGENT_TOKEN não está configurado.", 500);
  }
  return { url: url.replace(/\/$/, ""), token };
}

async function chamar<T>(caminho: string, corpo?: unknown): Promise<T> {
  const { url, token } = configuracao();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${url}${caminho}`, {
      method: corpo === undefined ? "GET" : "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      cache: "no-store",
      signal: controller.signal,
    });
  } catch {
    throw new AgenteErro(
      `Não foi possível falar com o agente de OLTs em ${url}. Verifique se ele está rodando.`,
      503
    );
  } finally {
    clearTimeout(timeout);
  }
  let body: { erro?: string; erros?: string[] } & T;
  try {
    body = await response.json();
  } catch {
    throw new AgenteErro(`Resposta inválida do agente (HTTP ${response.status}).`, 502);
  }
  if (!response.ok) {
    throw new AgenteErro(body.erro ?? `Erro do agente (HTTP ${response.status}).`, response.status, body.erros ?? []);
  }
  return body;
}

export function conexaoDaOlt(olt: OltConexao) {
  return {
    driver: olt.driver,
    host: olt.host,
    porta: olt.porta,
    protocolo: olt.protocolo,
    usuario: olt.usuario,
    senha: decryptSecret(olt.senhaEncrypted),
  };
}

export async function chamarOlt<T>(olt: OltConexao, caminho: string, corpo: Record<string, unknown> = {}) {
  let conexao;
  try {
    conexao = conexaoDaOlt(olt);
  } catch (error) {
    const motivo = error instanceof Error ? error.message : "erro desconhecido";
    throw new AgenteErro(`Não foi possível decifrar a senha da OLT (${motivo}). Edite a OLT e informe a senha de novo.`, 500);
  }
  return chamar<T>(caminho, { ...corpo, olt: conexao });
}

let catalogoEmCache: { valor: Catalogo; ate: number } | null = null;

export async function obterCatalogo(): Promise<Catalogo> {
  if (catalogoEmCache && catalogoEmCache.ate > Date.now()) return catalogoEmCache.valor;
  const valor = await chamar<Catalogo>("/drivers");
  catalogoEmCache = { valor, ate: Date.now() + CATALOGO_TTL_MS };
  return valor;
}

// Para páginas: devolve o catálogo ou a mensagem de erro, sem derrubar a tela.
export async function tentarCatalogo(): Promise<{ catalogo: Catalogo | null; erro: string | null }> {
  try {
    return { catalogo: await obterCatalogo(), erro: null };
  } catch (error) {
    return { catalogo: null, erro: mensagemDeErro(error) };
  }
}

export function mensagemDeErro(error: unknown): string {
  if (error instanceof AgenteErro) {
    return error.erros.length ? `${error.message}: ${error.erros.join("; ")}` : error.message;
  }
  return error instanceof Error ? error.message : "Erro desconhecido.";
}

// Leitura para páginas: dado ou mensagem de erro.
export async function lerOlt<T>(
  olt: OltConexao,
  caminho: string,
  corpo: Record<string, unknown> = {}
): Promise<{ dados: T | null; erro: string | null }> {
  try {
    return { dados: await chamarOlt<T>(olt, caminho, corpo), erro: null };
  } catch (error) {
    return { dados: null, erro: mensagemDeErro(error) };
  }
}
