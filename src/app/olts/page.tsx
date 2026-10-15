import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { coletarOltAction } from "@/lib/actions/olts";
import { BotaoAcao } from "@/components/olt/BotaoAcao";
import { SinalBadge, StatusOltBadge, Vazio } from "@/components/olt/Indicadores";
import { PlusIcon } from "@/components/icons";
import { botao, tabela, tempoAtras } from "@/lib/olt/paginas";
import { dbm } from "@/lib/olt/rotulos";

export default async function OltsPage() {
  const session = await getSession();
  const olts = await prisma.olt.findMany({
    orderBy: { nome: "asc" },
    include: {
      coletas: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          leituras: {
            where: { OR: [{ online: false }, { classeSinal: "critico" }] },
            orderBy: [{ pon: "asc" }, { onuId: "asc" }],
          },
        },
      },
    },
  });

  const coletas = olts.map((o) => o.coletas[0]).filter(Boolean);
  const ok = coletas.filter((c) => c.sucesso);
  const resumo = {
    total: ok.reduce((s, c) => s + c.total, 0),
    online: ok.reduce((s, c) => s + c.online, 0),
    critico: ok.reduce((s, c) => s + c.sinalCritico, 0),
    pendentes: ok.reduce((s, c) => s + c.pendentes, 0),
    semResposta: coletas.length - ok.length,
  };
  const problemas = olts.flatMap((olt) => (olt.coletas[0]?.sucesso ? olt.coletas[0].leituras.map((l) => ({ olt, l })) : [])).slice(0, 100);

  const cards = [
    { rotulo: "OLTs", valor: olts.length, cor: "", extra: resumo.semResposta ? `${resumo.semResposta} sem resposta` : "" },
    { rotulo: "ONUs cadastradas", valor: resumo.total, cor: "" },
    { rotulo: "ONUs online", valor: resumo.online, cor: "text-emerald-700 dark:text-emerald-400" },
    { rotulo: "ONUs offline", valor: resumo.total - resumo.online, cor: "text-stone-500 dark:text-slate-400" },
    { rotulo: "Sinal crítico", valor: resumo.critico, cor: "text-red-700 dark:text-red-400" },
    { rotulo: "Aguardando autorização", valor: resumo.pendentes, cor: "text-amber-700 dark:text-amber-400" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-50">OLTs</h1>
          <p className="text-sm text-stone-500 dark:text-slate-400">
            Monitoramento e configuração das OLTs GPON. Os números abaixo vêm da última coleta de cada OLT.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/olts/glossario" className={botao.secundario}>
            Glossário GPON
          </Link>
          {session?.role === "ADMIN" && (
            <Link href="/olts/new" className={botao.primario}>
              <PlusIcon className="h-3.5 w-3.5" />
              Cadastrar OLT
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <div key={c.rotulo} className="rounded-xl border border-stone-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs text-stone-500 dark:text-slate-400">{c.rotulo}</div>
            <div className={`mt-1 text-2xl font-semibold ${c.cor}`}>{c.valor}</div>
            {c.extra && <div className="text-xs text-red-600 dark:text-red-400">{c.extra}</div>}
          </div>
        ))}
      </div>

      {olts.length === 0 ? (
        <Vazio>
          Nenhuma OLT cadastrada.{" "}
          {session?.role === "ADMIN" ? (
            <>
              <Link href="/olts/new" className={botao.link}>
                Cadastre a primeira
              </Link>{" "}
              — o driver “Demonstração” funciona sem equipamento.
            </>
          ) : (
            "Peça a um administrador para cadastrar."
          )}
        </Vazio>
      ) : (
        <div className={tabela.caixa}>
          <table className={tabela.tabela}>
            <thead className={tabela.thead}>
              <tr>
                <th className={tabela.th}>OLT</th>
                <th className={tabela.th}>Status</th>
                <th className={`${tabela.th} text-right`}>ONUs online</th>
                <th className={tabela.th}>Última coleta</th>
                <th className={tabela.th} />
              </tr>
            </thead>
            <tbody>
              {olts.map((olt) => {
                const coleta = olt.coletas[0];
                return (
                  <tr key={olt.id} className={tabela.tr}>
                    <td className={tabela.td}>
                      <Link href={`/olts/${olt.id}`} className={botao.link}>
                        {olt.nome}
                      </Link>
                      <div className="text-xs text-stone-500 dark:text-slate-400">
                        {olt.protocolo.toUpperCase()} {olt.host}:{olt.porta}
                        {olt.localizacao ? ` · ${olt.localizacao}` : ""}
                      </div>
                      {coleta && !coleta.sucesso && <div className="mt-0.5 max-w-md text-xs text-red-600 dark:text-red-400">{coleta.erro}</div>}
                    </td>
                    <td className={tabela.td}>
                      <StatusOltBadge coleta={coleta} />
                    </td>
                    <td className={`${tabela.td} text-right tabular-nums`}>{coleta?.sucesso ? `${coleta.online}/${coleta.total}` : "—"}</td>
                    <td className={`${tabela.td} text-xs text-stone-500 dark:text-slate-400`}>{coleta ? tempoAtras(coleta.createdAt) : "nunca"}</td>
                    <td className={`${tabela.td} text-right`}>
                      <BotaoAcao action={coletarOltAction.bind(null, olt.id)} label="Coletar" pendente="Coletando…" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {problemas.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">ONUs com problema ({problemas.length})</h2>
          <div className={tabela.caixa}>
            <table className={tabela.tabela}>
              <thead className={tabela.thead}>
                <tr>
                  <th className={tabela.th}>OLT</th>
                  <th className={tabela.th}>PON/ID</th>
                  <th className={tabela.th}>Serial</th>
                  <th className={tabela.th}>Nome</th>
                  <th className={tabela.th}>Situação</th>
                  <th className={`${tabela.th} text-right`}>Rx ONU (dBm)</th>
                </tr>
              </thead>
              <tbody>
                {problemas.map(({ olt, l }) => (
                  <tr key={l.id} className={tabela.tr}>
                    <td className={tabela.td}>{olt.nome}</td>
                    <td className={tabela.td}>
                      <Link href={`/olts/${olt.id}/onus/${l.pon}/${l.onuId}`} className={botao.link}>
                        {l.pon}/{l.onuId}
                      </Link>
                    </td>
                    <td className={`${tabela.td} font-mono text-xs`}>{l.sn}</td>
                    <td className={tabela.td}>{l.nome}</td>
                    <td className={tabela.td}>
                      <SinalBadge classe={l.online ? l.classeSinal : "offline"} />
                      {!l.online && l.ultimaQueda && <span className="ml-2 text-xs text-stone-500 dark:text-slate-400">{l.ultimaQueda}</span>}
                    </td>
                    <td className={`${tabela.td} text-right tabular-nums`}>{dbm(l.rxDbm)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
