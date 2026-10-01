import { SCRIPT_OPERATION_LABELS, type ScriptOperation } from "@/lib/script-constants";

const STYLES: Record<ScriptOperation, string> = {
  SET_PARAMS: "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  SET_URL: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  DELETE: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  OUTRO: "bg-stone-100 text-stone-600 dark:bg-slate-800 dark:text-slate-300",
};

export function ScriptOperationBadge({ operation }: { operation: ScriptOperation }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[operation] ?? STYLES.OUTRO}`}
    >
      {SCRIPT_OPERATION_LABELS[operation] ?? operation}
    </span>
  );
}
