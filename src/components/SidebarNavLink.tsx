"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function SidebarNavLink({
  href,
  icon,
  label,
  exact = [],
  prefixes = [],
}: {
  href: string;
  icon: ReactNode;
  label: string;
  // Caminhos extras considerados "ativos" para este item, além de `href`
  // — precisam ser dados serializáveis (não uma função), já que esse
  // componente roda no cliente mas é montado a partir de um Server
  // Component (Sidebar).
  exact?: string[];
  prefixes?: string[];
}) {
  const pathname = usePathname();
  const active =
    pathname === href ||
    exact.includes(pathname) ||
    prefixes.some((prefix) => pathname.startsWith(prefix));

  return (
    <Link
      href={href}
      className={
        active
          ? "flex items-center gap-2.5 rounded-md bg-teal-800/40 px-3 py-2 text-sm font-semibold text-teal-200"
          : "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-stone-50"
      }
    >
      {icon}
      {label}
    </Link>
  );
}
