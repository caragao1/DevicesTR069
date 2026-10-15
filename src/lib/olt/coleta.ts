import "server-only";
import type { Olt } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { chamarOlt, mensagemDeErro } from "@/lib/olt/agente";
import type { Onu } from "@/lib/olt/tipos";

const DIAS_DE_HISTORICO = Number(process.env.OLT_COLETA_DIAS ?? 30);

// Lê estado e sinal de todas as ONUs e grava um retrato para o painel e o
// histórico de sinal. Uma falha de conexão também fica registrada.
export async function coletarOlt(olt: Olt) {
  try {
    const { onus, pendentes } = await chamarOlt<{ onus: Onu[]; pendentes: number }>(olt, "/coletar");
    return await prisma.oltColeta.create({
      data: {
        oltId: olt.id,
        sucesso: true,
        total: onus.length,
        online: onus.filter((o) => o.online).length,
        sinalCritico: onus.filter((o) => o.classe_sinal === "critico").length,
        pendentes,
        leituras: {
          create: onus.map((o) => ({
            pon: o.pon,
            onuId: o.onu_id,
            sn: o.sn,
            nome: o.nome || null,
            online: o.online,
            ultimaQueda: o.queda_traduzida || o.ultima_queda || null,
            rxDbm: o.rx_dbm,
            txDbm: o.tx_dbm,
            oltRxDbm: o.olt_rx_dbm,
            temperaturaC: o.temperatura_c,
            classeSinal: o.classe_sinal,
          })),
        },
      },
    });
  } catch (error) {
    return prisma.oltColeta.create({
      data: { oltId: olt.id, sucesso: false, erro: mensagemDeErro(error) },
    });
  }
}

export async function apagarColetasAntigas() {
  if (!DIAS_DE_HISTORICO) return 0;
  const limite = new Date(Date.now() - DIAS_DE_HISTORICO * 24 * 60 * 60 * 1000);
  const { count } = await prisma.oltColeta.deleteMany({ where: { createdAt: { lt: limite } } });
  return count;
}
