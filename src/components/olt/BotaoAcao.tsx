"use client";

import { useActionState } from "react";
import type { MensagemState } from "@/lib/actions/olts";

// Botão que roda uma ação rápida (testar conexão, coletar) e mostra o resultado ao lado.
export function BotaoAcao({
  action,
  label,
  pendente,
  variante = "secundario",
}: {
  action: () => Promise<MensagemState>;
  label: string;
  pendente: string;
  variante?: "primario" | "secundario";
}) {
  const [state, formAction, executando] = useActionState<MensagemState>(action, {});
  return (
    <form action={formAction} className="flex flex-col items-start gap-1.5">
      <button
        type="submit"
        disabled={executando}
        className={
          variante === "primario"
            ? "rounded-md bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60 dark:bg-teal-600 dark:hover:bg-teal-500"
            : "rounded-md border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-100 disabled:opacity-60 dark:border-slate-800 dark:text-stone-200 dark:hover:bg-slate-900"
        }
      >
        {executando ? pendente : label}
      </button>
      {state.mensagem && (
        <span className={`max-w-md text-xs ${state.ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {state.mensagem}
        </span>
      )}
    </form>
  );
}
