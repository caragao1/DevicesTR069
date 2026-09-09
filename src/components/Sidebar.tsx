import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/session";
import { logoutAction } from "@/lib/actions/auth";
import { BrandIcon, CpeIcon, OltIcon } from "@/components/icons";
import { ManufacturerLink } from "@/components/ManufacturerLink";
import { ThemeToggle } from "@/components/ThemeToggle";

export async function Sidebar({ session }: { session: SessionPayload }) {
  const manufacturers = await prisma.deviceModel.findMany({
    select: { manufacturer: true },
    distinct: ["manufacturer"],
    orderBy: { manufacturer: "asc" },
  });

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-slate-900 py-7">
      <Link
        href="/"
        className="flex flex-col gap-0.5 border-b border-slate-800 px-6 pb-6"
      >
        <span className="flex items-center gap-2 font-serif text-lg font-semibold text-stone-50">
          <BrandIcon className="h-5 w-5 text-teal-400" />
          IXC ACS
        </span>
        <span className="text-xs text-slate-400">
          Central de Equipamentos
        </span>
      </Link>

      <nav className="flex flex-col gap-0.5 px-4 pb-2 pt-5">
        <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Equipamentos
        </div>
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-md bg-teal-800/40 px-3 py-2 text-sm font-semibold text-teal-200"
        >
          <CpeIcon className="h-[17px] w-[17px]" />
          CPE / ONT
        </Link>
        <div className="flex items-center justify-between gap-2.5 rounded-md px-3 py-2 text-slate-500">
          <span className="flex items-center gap-2.5 text-sm">
            <OltIcon className="h-[17px] w-[17px]" />
            OLT
          </span>
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
            em breve
          </span>
        </div>
      </nav>

      {manufacturers.length > 0 && (
        <div className="mt-3 flex flex-col gap-0.5 border-t border-slate-800 px-4 pb-2 pt-5">
          <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Fabricantes
          </div>
          <div className="flex flex-col">
            {manufacturers.map(({ manufacturer }) => (
              <ManufacturerLink key={manufacturer} manufacturer={manufacturer} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto flex items-center gap-2.5 border-t border-slate-800 px-6 pt-4">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-800 text-[11px] font-semibold text-teal-100">
          {session.name
            .split(" ")
            .map((part) => part[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
        </div>
        <span className="min-w-0 flex-1 truncate text-[13px] text-stone-300">
          {session.name}
        </span>
        <ThemeToggle />
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-md px-2 py-1 text-xs font-medium text-slate-400 transition hover:bg-slate-800 hover:text-stone-100"
          >
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
