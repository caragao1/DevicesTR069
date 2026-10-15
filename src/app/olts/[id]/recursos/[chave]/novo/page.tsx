import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { carregarOlt } from "@/lib/olt/paginas";
import { lerOlt } from "@/lib/olt/agente";
import { origensDosCampos } from "@/lib/olt/formulario";
import { RecursosNav } from "@/components/olt/RecursosNav";
import { ErroAgente, Explicacao } from "@/components/olt/Indicadores";
import { OperacaoFlow } from "@/components/olt/OperacaoFlow";
import type { Opcoes } from "@/components/olt/CampoForm";

export default async function NovoRecursoPage({ params }: PageProps<"/olts/[id]/recursos/[chave]/novo">) {
  await requireSession();
  const { id, chave } = await params;
  const { olt, driver, erroCatalogo } = await carregarOlt(id);
  if (!driver) return <ErroAgente erro={erroCatalogo} />;
  const recurso = driver.recursos.find((r) => r.chave === chave);
  if (!recurso || !recurso.pode_criar) notFound();
  const origens = origensDosCampos(recurso.campos);
  const opcoes = origens.length ? await lerOlt<{ opcoes: Opcoes }>(olt, "/opcoes", { origens }) : { dados: { opcoes: {} }, erro: null };

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <RecursosNav oltId={id} recursos={driver.recursos} atual={chave} />
      <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Novo — {recurso.titulo}</h2>
      <Explicacao texto={recurso.descricao} aberto />
      {opcoes.erro && <ErroAgente erro={`Não foi possível carregar as opções da OLT: ${opcoes.erro}`} />}
      <OperacaoFlow
        oltId={id}
        base={{ acao: "criar", recurso: chave }}
        voltar={`/olts/${id}/recursos/${chave}`}
        campos={recurso.campos}
        opcoes={opcoes.dados?.opcoes ?? {}}
        avisoNaoHomologado={recurso.nao_homologado.includes("criar")}
        demo={olt.driver === "demo"}
      />
    </div>
  );
}
