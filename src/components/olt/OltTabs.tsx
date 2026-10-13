"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type Aba = { href: string; label: string; prefixo?: boolean; ativoEm?: string };

export function OltTabs({ abas }: { abas: Aba[] }) {
  const pathname = usePathname();
  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto border-b border-stone-200 dark:border-slate-800">
      {abas.map((aba) => {
        const raiz = aba.ativoEm ?? aba.href;
        const ativa = aba.prefixo || aba.ativoEm ? pathname === raiz || pathname.startsWith(`${raiz}/`) : pathname === aba.href;
        return (
          <Link
            key={aba.href}
            href={aba.href}
            className={
              ativa
                ? "whitespace-nowrap border-b-2 border-teal-600 px-3 py-2 text-sm font-semibold text-teal-800 dark:text-teal-300"
                : "whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm text-stone-600 hover:border-stone-300 hover:text-stone-900 dark:text-slate-400 dark:hover:text-stone-100"
            }
          >
            {aba.label}
          </Link>
        );
      })}
    </nav>
  );
}
