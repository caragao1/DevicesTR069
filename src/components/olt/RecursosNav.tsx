import Link from "next/link";
import type { Recurso } from "@/lib/olt/tipos";

// Sub-navegação entre os perfis/recursos que o driver da OLT declara.
export function RecursosNav({ oltId, recursos, atual }: { oltId: string; recursos: Recurso[]; atual: string }) {
  return (
    <nav className="flex flex-wrap gap-1.5">
      {recursos.map((r) => (
        <Link
          key={r.chave}
          href={`/olts/${oltId}/recursos/${r.chave}`}
          className={
            r.chave === atual
              ? "rounded-full bg-teal-700 px-3 py-1 text-xs font-semibold text-white dark:bg-teal-600"
              : "rounded-full border border-stone-200 px-3 py-1 text-xs font-medium text-stone-600 hover:bg-stone-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
          }
        >
          {r.titulo}
        </Link>
      ))}
    </nav>
  );
}
