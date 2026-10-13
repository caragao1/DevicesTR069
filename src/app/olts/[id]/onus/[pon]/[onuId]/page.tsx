import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { carregarOlt, botao, formatarData, tabela } from "@/lib/olt/paginas";
import { lerOlt } from "@/lib/olt/agente";
import { dbm } from "@/lib/olt/rotulos";
import type { DetalhesOnu, Onu } from "@/lib/olt/tipos";
import { EstadoOnuBadge, ErroAgente, NaoHomologadoBadge, SinalBadge } from "@/components/olt/Indicadores";
import { ResultadoOperacao } from "@/components/olt/ResultadoOperacao";

export default async function OnuPage({ params, searchParams }: PageProps<"/olts/[id]/onus/[pon]/[onuId]">) {
  const { id, pon: ponTexto, onuId: onuTexto } = await params;
  const sp = await searchParams;
  if (!/^\d+$/.test(ponTexto) || !/^\d+$/.test(onuTexto)) notFound();
  const pon = Number(ponTexto);
  const onuId = Number(onuTexto);
  const session = await getSession();
  const { olt, driver } = await carregarOlt(id);

  const { dados, erro } = await lerOlt<{ atual: Onu | null; detalhes: DetalhesOnu | null }>(olt, "/onu", { pon, onu_id: onuId });
  const historico = await prisma.oltLeituraOnu.findMany({
    where: { pon, onuId, coleta: { oltId: id } },
    include: { coleta: { select: { createdAt: true } } },
    orderBy: { coleta: { createdAt: "desc" } },
    take: 50,
  });
  const atual = dados?.atual;
  const detalhes = dados?.detalhes;
  const base = `/olts/${id}/onus/${pon}/${onuId}`;

  return (
    <div className="flex flex-col gap-5">
      <ResultadoOperacao id={sp.resultado} oltId={id} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">
          ONU {pon}/{onuId} {atual?.nome && <span className="font-normal text-stone-500 dark:text-slate-400">· {atual.nome}</span>}
        </h2>
        {session && (
          <div className="flex gap-2">
            <Link href={`${base}/reiniciar`} className={botao.secundario}>
              Reiniciar {driver?.acoes_nao_homologadas.includes("reiniciar") && <NaoHomologadoBadge />}
            </Link>
            <Link
              href={`${base}/desautorizar`}
              className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
            >
              Desautorizar
            </Link>
          </div>
        )}
      </div>
      <ErroAgente erro={erro} />
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-stone-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 font-semibold text-stone-900 dark:text-stone-50">Estado atual</h3>
          {atual ? (
            <dl className="grid grid-cols-[8rem_1fr] gap-y-1.5 text-sm">
              <dt className="text-stone-500 dark:text-slate-400">Serial</dt>
              <dd className="font-mono text-xs">{atual.sn}</dd>
              <dt className="text-stone-500 dark:text-slate-400">Estado</dt>
              <dd className="flex flex-wrap items-center gap-2">
                <EstadoOnuBadge online={atual.online} />
                <span className="text-xs text-stone-500 dark:text-slate-400">
                  config {atual.config_state} · match {atual.match_state}
                </span>
              </dd>
              <dt className="text-stone-500 dark:text-slate-400">Última queda</dt>
              <dd>
                {atual.queda_traduzida || "—"}
                {atual.ultima_queda && <span className="ml-1 text-xs text-stone-500 dark:text-slate-400">({atual.ultima_queda})</span>}
              </dd>
              <dt className="text-stone-500 dark:text-slate-400">Rx ONU</dt>
              <dd className="flex items-center gap-2">
                {dbm(atual.rx_dbm)} dBm <SinalBadge classe={atual.classe_sinal} />
              </dd>
              <dt className="text-stone-500 dark:text-slate-400">Tx ONU</dt>
              <dd>{dbm(atual.tx_dbm)} dBm</dd>
              <dt className="text-stone-500 dark:text-slate-400">Temperatura</dt>
              <dd>{atual.temperatura_c === null ? "—" : `${Math.round(atual.temperatura_c)} °C`}</dd>
            </dl>
          ) : (
            !erro && <p className="text-sm text-stone-500 dark:text-slate-400">ONU não encontrada na OLT.</p>
          )}
        </section>
        <section className="rounded-xl border border-stone-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 font-semibold text-stone-900 dark:text-stone-50">Provisionamento</h3>
          {detalhes ? (
            <>
              <dl className="grid grid-cols-[8rem_1fr] gap-y-1.5 text-sm">
                <dt className="text-stone-500 dark:text-slate-400">Line profile</dt>
                <dd>
                  <Link href={`/olts/${id}/recursos/line`} className={botao.link}>
                    {detalhes.line_profile_id ?? "—"}
                  </Link>
                </dd>
                <dt className="text-stone-500 dark:text-slate-400">Service profile</dt>
                <dd>
                  <Link href={`/olts/${id}/recursos/srv`} className={botao.link}>
                    {detalhes.srv_profile_id ?? "—"}
                  </Link>
                </dd>
              </dl>
              <p className="mt-3 text-xs text-stone-500 dark:text-slate-400">Configuração na OLT (senhas mascaradas):</p>
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-stone-100 p-2 font-mono text-xs dark:bg-slate-950">
                {detalhes.comandos.join("\n")}
              </pre>
            </>
          ) : (
            !erro && <p className="text-sm text-stone-500 dark:text-slate-400">Sem detalhes de configuração.</p>
          )}
        </section>
      </div>
      <section className="flex flex-col gap-3">
        <h3 className="font-semibold text-stone-900 dark:text-stone-50">Histórico de sinal (coletas)</h3>
        {historico.length === 0 ? (
          <p className="text-sm text-stone-500 dark:text-slate-400">Sem coletas para esta ONU.</p>
        ) : (
          <div className={tabela.caixa}>
            <table className={tabela.tabela}>
              <thead className={tabela.thead}>
                <tr>
                  <th className={tabela.th}>Quando</th>
                  <th className={tabela.th}>Estado</th>
                  <th className={`${tabela.th} text-right`}>Rx ONU</th>
                  <th className={`${tabela.th} text-right`}>Rx OLT</th>
                  <th className={`${tabela.th} text-right`}>Tx</th>
                  <th className={tabela.th}>Última queda</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((l) => (
                  <tr key={l.id} className={tabela.tr}>
                    <td className={tabela.td}>{formatarData(l.coleta.createdAt)}</td>
                    <td className={tabela.td}>
                      <EstadoOnuBadge online={l.online} />
                    </td>
                    <td className={`${tabela.td} text-right tabular-nums`}>{dbm(l.rxDbm)}</td>
                    <td className={`${tabela.td} text-right tabular-nums`}>{dbm(l.oltRxDbm)}</td>
                    <td className={`${tabela.td} text-right tabular-nums`}>{dbm(l.txDbm)}</td>
                    <td className={`${tabela.td} text-xs`}>{l.ultimaQueda}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
