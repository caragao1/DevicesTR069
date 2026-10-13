import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { apagarColetasAntigas, coletarOlt } from "@/lib/olt/coleta";

// Coleta periódica das OLTs monitoradas, chamada por um agendador (cron):
//   curl -X POST -H "Authorization: Bearer $OLT_CRON_TOKEN" https://<app>/api/olts/coletar
// Fica fora do proxy de login (rotas /api/), por isso valida o token aqui.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function autorizado(request: Request) {
  const token = process.env.OLT_CRON_TOKEN;
  if (!token || token.length < 16) return false;
  const recebido = Buffer.from(request.headers.get("authorization") ?? "");
  const esperado = Buffer.from(`Bearer ${token}`);
  return recebido.length === esperado.length && timingSafeEqual(recebido, esperado);
}

export async function POST(request: Request) {
  if (!autorizado(request)) {
    return Response.json({ erro: "Não autorizado" }, { status: 401 });
  }
  const olts = await prisma.olt.findMany({ where: { monitorar: true }, orderBy: { nome: "asc" } });
  const resultados = [];
  for (const olt of olts) {
    const coleta = await coletarOlt(olt);
    resultados.push({
      olt: olt.nome,
      sucesso: coleta.sucesso,
      online: coleta.online,
      total: coleta.total,
      sinalCritico: coleta.sinalCritico,
      pendentes: coleta.pendentes,
      erro: coleta.erro,
    });
  }
  const apagadas = await apagarColetasAntigas();
  return Response.json({ coletadas: resultados.length, resultados, coletasAntigasApagadas: apagadas });
}
