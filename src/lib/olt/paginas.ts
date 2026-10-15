import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { tentarCatalogo } from "@/lib/olt/agente";

// Carrega a OLT e a descrição do driver dela (campos, recursos, textos).
// cache(): o layout e a página da mesma requisição compartilham a consulta.
export const carregarOlt = cache(async (id: string) => {
  const olt = await prisma.olt.findUnique({ where: { id } });
  if (!olt) notFound();
  const { catalogo, erro } = await tentarCatalogo();
  const driver = catalogo?.drivers.find((d) => d.chave === olt.driver) ?? null;
  return {
    olt,
    catalogo,
    driver,
    erroCatalogo: erro ?? (catalogo && !driver ? `O agente não tem o driver "${olt.driver}".` : null),
  };
});

export const tabela = {
  caixa: "overflow-x-auto rounded-xl border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-900",
  tabela: "w-full text-sm",
  thead: "border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500 dark:border-slate-800 dark:text-slate-400",
  th: "px-3 py-2.5 font-semibold",
  tr: "border-b border-stone-100 last:border-0 dark:border-slate-800",
  td: "px-3 py-2",
};

export const botao = {
  primario:
    "inline-flex items-center gap-1.5 rounded-md bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500",
  secundario:
    "inline-flex items-center gap-1.5 rounded-md border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-100 dark:border-slate-800 dark:text-stone-200 dark:hover:bg-slate-900",
  link: "font-medium text-teal-700 hover:underline dark:text-teal-400",
};

export function tempoAtras(data: Date) {
  const segundos = Math.max(0, Math.round((Date.now() - data.getTime()) / 1000));
  if (segundos < 60) return "agora há pouco";
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 48) return `há ${horas} h`;
  return `há ${Math.round(horas / 24)} dias`;
}

export const formatarData = (data: Date) =>
  data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: process.env.TZ || "America/Sao_Paulo" });
