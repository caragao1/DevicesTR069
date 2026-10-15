import type { ClasseSinal } from "@/lib/olt/tipos";

export const PROTOCOLOS = ["ssh", "telnet"] as const;
export type Protocolo = (typeof PROTOCOLOS)[number];
export const PORTA_PADRAO: Record<Protocolo, number> = { ssh: 22, telnet: 23 };

export function isProtocolo(value: string): value is Protocolo {
  return (PROTOCOLOS as readonly string[]).includes(value);
}

export const CLASSE_SINAL: Record<ClasseSinal, { rotulo: string; estilo: string }> = {
  bom: { rotulo: "Bom", estilo: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  alerta: { rotulo: "Atenção", estilo: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  critico: { rotulo: "Crítico", estilo: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300" },
  forte: { rotulo: "Forte demais", estilo: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300" },
  offline: { rotulo: "Offline", estilo: "bg-stone-100 text-stone-600 dark:bg-slate-800 dark:text-slate-300" },
  "sem-leitura": { rotulo: "Sem leitura", estilo: "bg-stone-100 text-stone-500 dark:bg-slate-800 dark:text-slate-400" },
};

export const ACAO_ROTULO: Record<string, string> = {
  autorizar: "Autorizar ONU",
  desautorizar: "Desautorizar ONU",
  reiniciar: "Reiniciar ONU",
  criar: "Criar",
  remover: "Remover",
  script: "Script / CLI",
};

export function dbm(valor: number | null | undefined) {
  return valor === null || valor === undefined ? "—" : valor.toFixed(2);
}
