import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ACAO_ROTULO } from "@/lib/olt/rotulos";
import { formatarData, tabela } from "@/lib/olt/paginas";
import { Vazio } from "@/components/olt/Indicadores";

const POR_PAGINA = 50;

export async function ListaOperacoes({ oltId, pagina, base }: { oltId?: string; pagina: number; base: string }) {
  const where = oltId ? { oltId } : {};
  const [total, operacoes] = await Promise.all([
    prisma.oltOperacao.count({ where }),
    prisma.oltOperacao.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: { user: { select: { name: true } }, olt: { select: { id: true, nome: true } } },
    }),
  ]);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  if (total === 0) return <Vazio>Nenhuma operação registrada.</Vazio>;

  return (
    <div className="flex flex-col gap-3">
      <div className={tabela.caixa}>
        <table className={tabela.tabela}>
          <thead className={tabela.thead}>
            <tr>
              <th className={tabela.th}>Quando</th>
              {!oltId && <th className={tabela.th}>OLT</th>}
              <th className={tabela.th}>Usuário</th>
              <th className={tabela.th}>Ação</th>
              <th className={tabela.th}>Alvo</th>
              <th className={tabela.th}>Resultado</th>
            </tr>
          </thead>
          <tbody>
            {operacoes.map((op) => (
              <tr key={op.id} className={`${tabela.tr} align-top`}>
                <td className={`${tabela.td} whitespace-nowrap`}>{formatarData(op.createdAt)}</td>
                {!oltId && (
                  <td className={tabela.td}>
                    <Link href={`/olts/${op.olt.id}/historico`} className="font-medium text-teal-700 hover:underline dark:text-teal-400">
                      {op.olt.nome}
                    </Link>
                  </td>
                )}
                <td className={tabela.td}>{op.user?.name ?? "—"}</td>
                <td className={tabela.td}>
                  {ACAO_ROTULO[op.acao] ?? op.acao}
                  {op.recurso && op.recurso !== "onu" && <span className="text-xs text-stone-500 dark:text-slate-400"> · {op.recurso}</span>}
                </td>
                <td className={`${tabela.td} font-mono text-xs`}>{op.alvo}</td>
                <td className={tabela.td}>
                  <details>
                    <summary className={`cursor-pointer text-xs font-semibold ${op.sucesso ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {op.sucesso ? "OK" : "Falhou"}
                    </summary>
                    <pre className="mt-1 max-w-xl whitespace-pre-wrap break-all font-mono text-xs">{op.comandos}</pre>
                    {op.erro && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{op.erro}</p>}
                    {op.saidas && <pre className="mt-1 max-w-xl whitespace-pre-wrap font-mono text-xs text-stone-500 dark:text-slate-400">{op.saidas}</pre>}
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {paginas > 1 && (
        <div className="flex items-center gap-3 text-sm">
          {pagina > 1 && (
            <Link href={`${base}?pagina=${pagina - 1}`} className="text-teal-700 hover:underline dark:text-teal-400">
              ← Anteriores
            </Link>
          )}
          <span className="text-stone-500 dark:text-slate-400">
            Página {pagina} de {paginas}
          </span>
          {pagina < paginas && (
            <Link href={`${base}?pagina=${pagina + 1}`} className="text-teal-700 hover:underline dark:text-teal-400">
              Próximas →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export function paginaDe(valor: string | string[] | undefined) {
  const n = typeof valor === "string" ? Number(valor) : 1;
  return Number.isInteger(n) && n > 0 ? n : 1;
}
