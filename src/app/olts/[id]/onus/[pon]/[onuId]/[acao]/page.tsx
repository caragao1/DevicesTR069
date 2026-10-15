import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { carregarOlt } from "@/lib/olt/paginas";
import { OperacaoFlow } from "@/components/olt/OperacaoFlow";

const ACOES = {
  reiniciar: { titulo: "Reiniciar ONU", texto: "A ONU reinicia e o cliente fica alguns minutos sem conexão." },
  desautorizar: {
    titulo: "Desautorizar (remover) ONU",
    texto: "Remove a ONU da OLT. O cliente fica sem serviço até ela ser autorizada de novo.",
  },
} as const;

export default async function OnuAcaoPage({ params }: PageProps<"/olts/[id]/onus/[pon]/[onuId]/[acao]">) {
  await requireSession();
  const { id, pon, onuId, acao } = await params;
  if (!(acao in ACOES) || !/^\d+$/.test(pon) || !/^\d+$/.test(onuId)) notFound();
  const info = ACOES[acao as keyof typeof ACOES];
  const { olt, driver } = await carregarOlt(id);
  const voltar = acao === "desautorizar" ? `/olts/${id}/onus` : `/olts/${id}/onus/${pon}/${onuId}`;
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">
          {info.titulo} {pon}/{onuId}
        </h2>
        <p className="text-sm text-stone-500 dark:text-slate-400">{info.texto}</p>
      </div>
      <OperacaoFlow
        oltId={id}
        base={{ acao: acao as keyof typeof ACOES, pon: Number(pon), onu_id: Number(onuId) }}
        voltar={voltar}
        demo={olt.driver === "demo"}
        avisoNaoHomologado={driver?.acoes_nao_homologadas.includes(acao) ?? false}
      />
    </div>
  );
}
