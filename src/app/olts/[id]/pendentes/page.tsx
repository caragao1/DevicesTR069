import Link from "next/link";
import { getSession } from "@/lib/session";
import { carregarOlt, botao, tabela } from "@/lib/olt/paginas";
import { lerOlt } from "@/lib/olt/agente";
import type { Pendente } from "@/lib/olt/tipos";
import { ErroAgente, Explicacao, Vazio } from "@/components/olt/Indicadores";
import { ResultadoOperacao } from "@/components/olt/ResultadoOperacao";

export default async function PendentesPage({ params, searchParams }: PageProps<"/olts/[id]/pendentes">) {
  const { id } = await params;
  const sp = await searchParams;
  const session = await getSession();
  const { olt, catalogo } = await carregarOlt(id);
  const { dados, erro } = await lerOlt<{ pendentes: Pendente[] }>(olt, "/pendentes");
  const pendentes = dados?.pendentes ?? [];
  // A tabela do autofind muda de firmware para firmware: mostra as colunas que vierem.
  const rotulos: Record<string, string> = {
    modelo: "Modelo",
    fabricante: "Fabricante",
    firmware: "Firmware",
    hardware: "Hardware",
    loid: "LOID",
    detectada_em: "Detectada em",
  };
  const presentes = [...new Set(pendentes.flatMap((p) => Object.keys(p)))].filter((c) => !["pon", "sn", "sn_hex", "indice"].includes(c));
  // campos conhecidos primeiro, com nome legível; o que o firmware trouxer a mais vem depois, como veio
  const colunas = [...Object.keys(rotulos).filter((c) => presentes.includes(c)), ...presentes.filter((c) => !(c in rotulos))];

  return (
    <div className="flex flex-col gap-4">
      <ResultadoOperacao id={sp.resultado} oltId={id} />
      <Explicacao titulo="Como funciona a autorização" texto={catalogo?.textos.onu.pendentes ?? ""} aberto />
      <div className="flex justify-end">
        {session && (
          <Link href={`/olts/${id}/autorizar`} className={botao.secundario}>
            Autorizar informando o serial
          </Link>
        )}
      </div>
      <ErroAgente erro={erro} />
      {!erro && pendentes.length === 0 ? (
        <Vazio>Nenhuma ONU aguardando autorização.</Vazio>
      ) : (
        pendentes.length > 0 && (
          <div className={tabela.caixa}>
            <table className={tabela.tabela}>
              <thead className={tabela.thead}>
                <tr>
                  <th className={tabela.th}>PON</th>
                  <th className={tabela.th}>Serial</th>
                  {colunas.map((c) => (
                    <th key={c} className={tabela.th}>
                      {rotulos[c] ?? c.replace(/_/g, " ")}
                    </th>
                  ))}
                  <th className={tabela.th} />
                </tr>
              </thead>
              <tbody>
                {pendentes.map((p, i) => (
                  <tr key={`${p.sn ?? i}`} className={tabela.tr}>
                    <td className={tabela.td}>{p.pon ?? "?"}</td>
                    <td className={`${tabela.td} font-mono text-xs`}>{p.sn ?? "?"}</td>
                    {colunas.map((c) => (
                      <td key={c} className={`${tabela.td} text-xs`}>
                        {String(p[c] ?? "")}
                      </td>
                    ))}
                    <td className={`${tabela.td} text-right`}>
                      {session && (
                        <Link
                          href={`/olts/${id}/autorizar?${new URLSearchParams({ pon: String(p.pon ?? ""), sn: String(p.sn ?? "") })}`}
                          className={botao.primario}
                        >
                          Autorizar
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
