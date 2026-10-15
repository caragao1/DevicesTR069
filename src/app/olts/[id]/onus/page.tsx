import Link from "next/link";
import { carregarOlt, botao, tabela } from "@/lib/olt/paginas";
import { lerOlt } from "@/lib/olt/agente";
import { dbm } from "@/lib/olt/rotulos";
import type { Onu } from "@/lib/olt/tipos";
import { EstadoOnuBadge, ErroAgente, Explicacao, SinalBadge, Vazio } from "@/components/olt/Indicadores";
import { ResultadoOperacao } from "@/components/olt/ResultadoOperacao";

const selectClass =
  "rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-sm text-stone-700 dark:border-slate-800 dark:bg-slate-900 dark:text-stone-200";

export default async function OnusPage({ params, searchParams }: PageProps<"/olts/[id]/onus">) {
  const { id } = await params;
  const sp = await searchParams;
  const { olt, catalogo } = await carregarOlt(id);
  const pon = typeof sp.pon === "string" && /^\d+$/.test(sp.pon) ? Number(sp.pon) : null;
  const oltRx = sp.olt_rx === "1";
  const busca = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";

  const { dados, erro } = await lerOlt<{ onus: Onu[] }>(olt, "/onus", { pon, olt_rx: oltRx });
  const todas = dados?.onus ?? [];
  const onus = busca ? todas.filter((o) => o.sn.toLowerCase().includes(busca) || o.nome.toLowerCase().includes(busca)) : todas;
  const pons = [...new Set(todas.map((o) => o.pon))].sort((a, b) => a - b);
  const limites = catalogo?.textos.limites;

  return (
    <div className="flex flex-col gap-4">
      <ResultadoOperacao id={sp.resultado} oltId={id} />
      <div className="flex flex-col gap-2">
        <Explicacao titulo="Como ler o estado das ONUs" texto={catalogo?.textos.onu.autorizadas ?? ""} />
        <Explicacao titulo="Como interpretar o sinal óptico" texto={catalogo?.textos.onu.sinal ?? ""} />
      </div>
      <form className="flex flex-wrap items-center gap-2" action={`/olts/${id}/onus`}>
        <input name="q" defaultValue={busca} placeholder="Buscar serial ou nome" className={selectClass} />
        <select name="pon" defaultValue={pon ?? ""} className={selectClass}>
          <option value="">Todas as PONs</option>
          {pons.map((p) => (
            <option key={p} value={p}>
              PON {p}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-stone-700 dark:text-stone-200" title="Entra em cada PON para ler o sinal que a OLT recebe. Mais lento.">
          <input type="checkbox" name="olt_rx" value="1" defaultChecked={oltRx} />
          Ler Rx da OLT
        </label>
        <button type="submit" className="rounded-md bg-stone-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-stone-100 dark:text-stone-900">
          Atualizar
        </button>
      </form>
      <ErroAgente erro={erro} />
      {!erro && onus.length === 0 ? (
        <Vazio>Nenhuma ONU encontrada.</Vazio>
      ) : (
        onus.length > 0 && (
          <div className={tabela.caixa}>
            <table className={tabela.tabela}>
              <thead className={tabela.thead}>
                <tr>
                  <th className={tabela.th}>PON/ID</th>
                  <th className={tabela.th}>Serial</th>
                  <th className={tabela.th}>Nome</th>
                  <th className={tabela.th}>Estado da ONU</th>
                  <th className={tabela.th}>Última queda</th>
                  <th className={`${tabela.th} text-right`}>Rx ONU</th>
                  <th className={`${tabela.th} text-right`}>Rx OLT</th>
                  <th className={`${tabela.th} text-right`}>Tx</th>
                  <th className={`${tabela.th} text-right`}>Temp.</th>
                  <th className={tabela.th}>Sinal</th>
                </tr>
              </thead>
              <tbody>
                {onus.map((o) => (
                  <tr key={`${o.pon}/${o.onu_id}`} className={tabela.tr}>
                    <td className={tabela.td}>
                      <Link href={`/olts/${id}/onus/${o.pon}/${o.onu_id}`} className={botao.link}>
                        {o.pon}/{o.onu_id}
                      </Link>
                    </td>
                    <td className={`${tabela.td} font-mono text-xs`}>{o.sn}</td>
                    <td className={tabela.td}>{o.nome}</td>
                    <td className={tabela.td}>
                      <EstadoOnuBadge online={o.online} />
                    </td>
                    <td className={`${tabela.td} text-xs`} title={o.ultima_queda}>
                      {o.queda_traduzida}
                    </td>
                    <td className={`${tabela.td} text-right tabular-nums`}>{dbm(o.rx_dbm)}</td>
                    <td className={`${tabela.td} text-right tabular-nums`}>{dbm(o.olt_rx_dbm)}</td>
                    <td className={`${tabela.td} text-right tabular-nums`}>{dbm(o.tx_dbm)}</td>
                    <td className={`${tabela.td} text-right tabular-nums`}>{o.temperatura_c === null ? "" : `${Math.round(o.temperatura_c)} °C`}</td>
                    <td className={tabela.td}>
                      <SinalBadge classe={o.classe_sinal} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
      {limites && (
        <p className="text-xs text-stone-500 dark:text-slate-400">
          Leitura feita agora, direto na OLT. Valores em dBm. Bom: entre {limites.forte} e {limites.alerta} · Atenção: entre {limites.alerta} e{" "}
          {limites.critico} · Crítico: abaixo de {limites.critico} · Forte demais: acima de {limites.forte}.
        </p>
      )}
    </div>
  );
}
