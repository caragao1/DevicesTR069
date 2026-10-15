import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { carregarOlt } from "@/lib/olt/paginas";
import { RecursosNav } from "@/components/olt/RecursosNav";
import { ErroAgente } from "@/components/olt/Indicadores";
import { OperacaoFlow } from "@/components/olt/OperacaoFlow";

export default async function RemoverRecursoPage({ params }: PageProps<"/olts/[id]/recursos/[chave]/remover/[itemId]">) {
  await requireSession();
  const { id, chave, itemId } = await params;
  const { olt, driver, erroCatalogo } = await carregarOlt(id);
  if (!driver) return <ErroAgente erro={erroCatalogo} />;
  const recurso = driver.recursos.find((r) => r.chave === chave);
  if (!recurso || !recurso.pode_remover) notFound();
  const item = decodeURIComponent(itemId);

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <RecursosNav oltId={id} recursos={driver.recursos} atual={chave} />
      <div>
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">
          Remover {recurso.titulo} #{item}
        </h2>
        <p className="text-sm text-stone-500 dark:text-slate-400">
          Se o perfil estiver em uso por alguma ONU ou outro perfil, a OLT recusa e nada é removido.
        </p>
      </div>
      <OperacaoFlow
        oltId={id}
        base={{ acao: "remover", recurso: chave, item_id: item }}
        voltar={`/olts/${id}/recursos/${chave}`}
        avisoNaoHomologado={recurso.nao_homologado.includes("remover")}
        demo={olt.driver === "demo"}
      />
    </div>
  );
}
