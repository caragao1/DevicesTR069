"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ManufacturerLink({ manufacturer }: { manufacturer: string }) {
  const pathname = usePathname();
  const href = `/fabricantes/${encodeURIComponent(manufacturer)}`;
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 text-[13.5px] transition ${
        active
          ? "bg-slate-800 text-stone-100"
          : "text-stone-300 hover:bg-slate-800/60 hover:text-stone-100"
      }`}
    >
      {manufacturer}
    </Link>
  );
}
