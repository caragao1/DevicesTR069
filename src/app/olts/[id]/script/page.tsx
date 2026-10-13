import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { carregarOlt, formatarData } from "@/lib/olt/paginas";
import { OperacaoFlow } from "@/components/olt/OperacaoFlow";
import { ResultadoOperacao } from "@/components/olt/ResultadoOperacao";

export default async function ScriptPage({ params, searchParams }: PageProps<"/olts/[id]/script">) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const { olt } = await carregarOlt(id);
  const ultimas = await prisma.oltOperacao.findMany({
    where: { oltId: id, acao: "script" },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { user: { select: { name: true } } },
  });

  return (
    <div className="flex flex-col gap-5">
      <ResultadoOperacao id={sp.resultado} oltId={id} />
      <div className="max-w-3xl">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Script / CLI</h2>
        <p className="text-sm text-stone-500 dark:text-slate-400">
          Envia comandos direto à OLT, sem validação — para o que a interface ainda não cobre. A sessão já começa em modo{" "}
          <code>configure</code>. Só administradores.
        </p>
      </div>
      <div className="max-w-3xl">
        <OperacaoFlow oltId={id} base={{ acao: "script" }} voltar={`/olts/${id}/script`} modoScript demo={olt.driver === "demo"} rotuloPrevia="Prévia" />
      </div>
      {ultimas.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="font-semibold text-stone-900 dark:text-stone-50">Últimas execuções</h3>
          {ultimas.map((op) => (
            <details key={op.id} className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
              <summary className="cursor-pointer">
                {formatarData(op.createdAt)} · {op.user?.name ?? "—"} ·{" "}
                {op.sucesso ? <span className="text-emerald-700 dark:text-emerald-400">OK</span> : <span className="text-red-600 dark:text-red-400">{op.erro}</span>}
                <span className="ml-2 font-mono text-xs text-stone-500 dark:text-slate-400">{op.alvo}</span>
              </summary>
              <pre className="mt-2 whitespace-pre-wrap font-mono text-xs">{op.comandos}</pre>
              {op.saidas && <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-stone-500 dark:text-slate-400">{op.saidas}</pre>}
            </details>
          ))}
        </section>
      )}
    </div>
  );
}
