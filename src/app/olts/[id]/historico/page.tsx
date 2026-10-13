import { ListaOperacoes, paginaDe } from "@/components/olt/ListaOperacoes";

export default async function HistoricoOltPage({ params, searchParams }: PageProps<"/olts/[id]/historico">) {
  const { id } = await params;
  const sp = await searchParams;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-stone-500 dark:text-slate-400">
        Tudo que foi executado nesta OLT pela interface: quem fez, os comandos (senhas mascaradas) e a resposta da OLT.
      </p>
      <ListaOperacoes oltId={id} pagina={paginaDe(sp.pagina)} base={`/olts/${id}/historico`} />
    </div>
  );
}
