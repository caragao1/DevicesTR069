import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { coletarOltAction, testarOltAction } from "@/lib/actions/olts";
import { carregarOlt, botao, formatarData, tabela } from "@/lib/olt/paginas";
import { BotaoAcao } from "@/components/olt/BotaoAcao";
import { ErroAgente } from "@/components/olt/Indicadores";

export default async function OltVisaoGeralPage({ params }: PageProps<"/olts/[id]">) {
  const { id } = await params;
  const session = await getSession();
  const { olt, erroCatalogo } = await carregarOlt(id);
  const coletas = await prisma.oltColeta.findMany({ where: { oltId: id }, orderBy: { createdAt: "desc" }, take: 10 });
  const ultima = coletas[0];

  const numeros = ultima?.sucesso
    ? [
        { rotulo: "ONUs", valor: ultima.total, cor: "" },
        { rotulo: "online", valor: ultima.online, cor: "text-emerald-700 dark:text-emerald-400" },
        { rotulo: "offline", valor: ultima.total - ultima.online, cor: "text-stone-500 dark:text-slate-400" },
        { rotulo: "sinal crítico", valor: ultima.sinalCritico, cor: "text-red-700 dark:text-red-400" },
        { rotulo: "pendentes", valor: ultima.pendentes, cor: "text-amber-700 dark:text-amber-400" },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <ErroAgente erro={erroCatalogo} />
      <div className="flex flex-wrap items-start gap-3">
        <BotaoAcao action={coletarOltAction.bind(null, id)} label="Coletar agora" pendente="Coletando…" variante="primario" />
        <BotaoAcao action={testarOltAction.bind(null, id)} label="Testar conexão" pendente="Conectando…" />
        {session?.role === "ADMIN" && (
          <Link href={`/olts/${id}/edit`} className={botao.secundario}>
            Editar cadastro
          </Link>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-stone-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 font-semibold text-stone-900 dark:text-stone-50">Cadastro</h2>
          <dl className="grid grid-cols-[8rem_1fr] gap-y-1.5 text-sm">
            <dt className="text-stone-500 dark:text-slate-400">Acesso</dt>
            <dd className="font-mono text-xs">
              {olt.protocolo.toUpperCase()} {olt.host}:{olt.porta}
            </dd>
            <dt className="text-stone-500 dark:text-slate-400">Usuário</dt>
            <dd>{olt.usuario}</dd>
            {olt.localizacao && (
              <>
                <dt className="text-stone-500 dark:text-slate-400">Localização</dt>
                <dd>{olt.localizacao}</dd>
              </>
            )}
            <dt className="text-stone-500 dark:text-slate-400">Monitorada</dt>
            <dd>{olt.monitorar ? "Sim" : "Não"}</dd>
          </dl>
          {olt.observacoes && <p className="mt-3 whitespace-pre-line text-sm text-stone-600 dark:text-slate-300">{olt.observacoes}</p>}
          {olt.protocolo === "telnet" && (
            <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              Telnet envia usuário e senha sem criptografia. Use apenas em rede de gerência isolada.
            </p>
          )}
        </section>
        <section className="rounded-xl border border-stone-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 font-semibold text-stone-900 dark:text-stone-50">Última coleta</h2>
          {!ultima ? (
            <p className="text-sm text-stone-500 dark:text-slate-400">
              Ainda não houve coleta. Clique em <strong>Coletar agora</strong> para ler estado e sinal das ONUs.
            </p>
          ) : ultima.sucesso ? (
            <div className="grid grid-cols-5 gap-2 text-center">
              {numeros.map((n) => (
                <div key={n.rotulo}>
                  <div className={`text-2xl font-semibold ${n.cor}`}>{n.valor}</div>
                  <div className="text-xs text-stone-500 dark:text-slate-400">{n.rotulo}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              <strong>A OLT não respondeu:</strong> {ultima.erro}
            </p>
          )}
          {ultima && <p className="mt-3 text-xs text-stone-500 dark:text-slate-400">{formatarData(ultima.createdAt)}</p>}
        </section>
      </div>

      {coletas.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Coletas recentes</h2>
          <div className={tabela.caixa}>
            <table className={tabela.tabela}>
              <thead className={tabela.thead}>
                <tr>
                  <th className={tabela.th}>Quando</th>
                  <th className={tabela.th}>Resultado</th>
                  <th className={`${tabela.th} text-right`}>Online / total</th>
                  <th className={`${tabela.th} text-right`}>Sinal crítico</th>
                  <th className={`${tabela.th} text-right`}>Pendentes</th>
                </tr>
              </thead>
              <tbody>
                {coletas.map((c) => (
                  <tr key={c.id} className={tabela.tr}>
                    <td className={tabela.td}>{formatarData(c.createdAt)}</td>
                    <td className={`${tabela.td} max-w-sm`}>
                      {c.sucesso ? <span className="text-emerald-700 dark:text-emerald-400">OK</span> : <span className="text-red-600 dark:text-red-400">{c.erro}</span>}
                    </td>
                    <td className={`${tabela.td} text-right tabular-nums`}>{c.sucesso ? `${c.online}/${c.total}` : "—"}</td>
                    <td className={`${tabela.td} text-right tabular-nums`}>{c.sucesso ? c.sinalCritico : "—"}</td>
                    <td className={`${tabela.td} text-right tabular-nums`}>{c.sucesso ? c.pendentes : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
