import { CLASSE_SINAL } from "@/lib/olt/rotulos";
import type { ClasseSinal } from "@/lib/olt/tipos";

const pill = "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold";

export function SinalBadge({ classe }: { classe: ClasseSinal | string | null }) {
  const info = CLASSE_SINAL[(classe ?? "sem-leitura") as ClasseSinal] ?? CLASSE_SINAL["sem-leitura"];
  return <span className={`${pill} ${info.estilo}`}>{info.rotulo}</span>;
}

export function EstadoOnuBadge({ online }: { online: boolean }) {
  return online ? (
    <span className={`${pill} bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300`}>Online</span>
  ) : (
    <span className={`${pill} bg-stone-100 text-stone-600 dark:bg-slate-800 dark:text-slate-300`}>Offline</span>
  );
}

// Estado da OLT = resultado da última coleta (a OLT respondeu ou não).
export function StatusOltBadge({ coleta }: { coleta?: { sucesso: boolean; erro: string | null } | null }) {
  if (!coleta) {
    return <span className={`${pill} bg-stone-100 text-stone-500 dark:bg-slate-800 dark:text-slate-400`}>Não coletada</span>;
  }
  return coleta.sucesso ? (
    <span className={`${pill} bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300`}>
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
      OLT respondendo
    </span>
  ) : (
    <span className={`${pill} bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300`} title={coleta.erro ?? undefined}>
      <span className="h-1.5 w-1.5 rounded-full bg-red-600 dark:bg-red-400" />
      OLT sem resposta
    </span>
  );
}

export function NaoHomologadoBadge() {
  return (
    <span className={`${pill} bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300`} title="Comando ainda não validado em equipamento real">
      não homologado
    </span>
  );
}

// Bloco "O que é isso?" recolhível, com o texto explicativo do driver.
export function Explicacao({ titulo = "O que é isso?", texto, aberto = false }: { titulo?: string; texto: string; aberto?: boolean }) {
  if (!texto) return null;
  return (
    <details open={aberto} className="rounded-lg border border-teal-200 bg-teal-50/60 px-4 py-2.5 text-sm dark:border-teal-900 dark:bg-teal-950/40">
      <summary className="cursor-pointer font-medium text-teal-800 dark:text-teal-300">{titulo}</summary>
      <p className="mt-2 whitespace-pre-line text-stone-700 dark:text-slate-300">{texto}</p>
    </details>
  );
}

export function ErroAgente({ erro }: { erro: string | null }) {
  if (!erro) return null;
  return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{erro}</p>;
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500 dark:border-slate-700 dark:text-slate-400">
      {children}
    </p>
  );
}
