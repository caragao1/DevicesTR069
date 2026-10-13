import { ListaOperacoes, paginaDe } from "@/components/olt/ListaOperacoes";

export default async function HistoricoPage({ searchParams }: PageProps<"/olts/historico">) {
  const sp = await searchParams;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-50">Histórico de operações nas OLTs</h1>
        <p className="text-sm text-stone-500 dark:text-slate-400">Todas as OLTs, mais recentes primeiro.</p>
      </div>
      <ListaOperacoes pagina={paginaDe(sp.pagina)} base="/olts/historico" />
    </div>
  );
}
