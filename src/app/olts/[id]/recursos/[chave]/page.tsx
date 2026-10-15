import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { carregarOlt, botao, tabela } from "@/lib/olt/paginas";
import { lerOlt } from "@/lib/olt/agente";
import type { Item } from "@/lib/olt/tipos";
import { RecursosNav } from "@/components/olt/RecursosNav";
import { ErroAgente, Explicacao, NaoHomologadoBadge, Vazio } from "@/components/olt/Indicadores";
import { ResultadoOperacao } from "@/components/olt/ResultadoOperacao";
import { PlusIcon } from "@/components/icons";

export default async function RecursoPage({ params, searchParams }: PageProps<"/olts/[id]/recursos/[chave]">) {
  const { id, chave } = await params;
  const sp = await searchParams;
  const session = await getSession();
  const { olt, driver, erroCatalogo } = await carregarOlt(id);
  if (!driver) return <ErroAgente erro={erroCatalogo} />;
  const recurso = driver.recursos.find((r) => r.chave === chave);
  if (!recurso) notFound();

  const { dados, erro } = await lerOlt<{ itens: Item[] }>(olt, "/recursos/listar", { recurso: chave });
  const itens = dados?.itens ?? [];

  return (
    <div className="flex flex-col gap-4">
      <RecursosNav oltId={id} recursos={driver.recursos} atual={chave} />
      <ResultadoOperacao id={sp.resultado} oltId={id} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">
          {recurso.titulo} ({itens.length})
        </h2>
        {session && recurso.pode_criar && (
          <Link href={`/olts/${id}/recursos/${chave}/novo`} className={botao.primario}>
            <PlusIcon className="h-3.5 w-3.5" />
            Novo {recurso.nao_homologado.includes("criar") && <NaoHomologadoBadge />}
          </Link>
        )}
      </div>
      <Explicacao titulo={`O que são ${recurso.titulo}?`} texto={recurso.descricao} />
      <ErroAgente erro={erro} />
      {!erro && itens.length === 0 ? (
        <Vazio>Nenhum item cadastrado na OLT.</Vazio>
      ) : (
        itens.length > 0 && (
          <div className={tabela.caixa}>
            <table className={tabela.tabela}>
              <thead className={tabela.thead}>
                <tr>
                  {recurso.colunas.map(([c, rotulo]) => (
                    <th key={c} className={tabela.th}>
                      {rotulo}
                    </th>
                  ))}
                  <th className={tabela.th} />
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => {
                  const itemId = String(item[recurso.chave_item]);
                  return (
                    <tr key={itemId} className={`${tabela.tr} align-top`}>
                      {recurso.colunas.map(([c]) => (
                        <td key={c} className={`${tabela.td} ${c === "id" || c === "nome" ? "font-semibold" : "text-xs"}`}>
                          {String(item[c] ?? "")}
                        </td>
                      ))}
                      <td className={`${tabela.td} whitespace-nowrap text-right text-xs`}>
                        {item.linhas && item.linhas.length > 0 && (
                          <details className="mb-1 inline-block text-left">
                            <summary className="cursor-pointer text-teal-700 dark:text-teal-400">configuração</summary>
                            <pre className="mt-1 whitespace-pre-wrap font-mono">{item.linhas.join("\n")}</pre>
                          </details>
                        )}
                        {session && recurso.pode_remover && (
                          <Link href={`/olts/${id}/recursos/${chave}/remover/${encodeURIComponent(itemId)}`} className="ml-3 text-red-600 hover:underline dark:text-red-400">
                            Remover
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
      {recurso.nao_homologado.length > 0 && (
        <p className="text-xs text-stone-500 dark:text-slate-400">
          Neste modelo, os comandos de {recurso.nao_homologado.join(" e ")} ainda não foram validados em equipamento real.
        </p>
      )}
    </div>
  );
}
