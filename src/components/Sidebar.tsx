import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/session";
import { logoutAction } from "@/lib/actions/auth";
import {
  BrandIcon,
  ChecklistIcon,
  CpeIcon,
  OltIcon,
  PlusIcon,
  UsersIcon,
} from "@/components/icons";
import { ManufacturerLink } from "@/components/ManufacturerLink";
import { SidebarNavLink } from "@/components/SidebarNavLink";
import { ThemeToggle } from "@/components/ThemeToggle";

export async function Sidebar({
  session,
}: {
  session: SessionPayload | null;
}) {
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
        <SidebarNavLink
          href="/"
          icon={<CpeIcon className="h-[17px] w-[17px]" />}
          label="CPE / ONT"
          prefixes={["/fabricantes/", "/models/", "/limitations/"]}
        />
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

      <div className="mt-3 flex flex-col gap-0.5 border-t border-slate-800 px-4 pb-2 pt-5">
        <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Capacidades de equipamentos
        </div>
        <SidebarNavLink
          href="/capacidades"
          icon={<ChecklistIcon className="h-[17px] w-[17px]" />}
          label="Equipamentos registrados"
          exact={["/capacidades/relatorio"]}
          prefixes={["/capacidades/registro/"]}
        />
        {session && (
          <SidebarNavLink
            href="/capacidades/registrar"
            icon={<PlusIcon className="h-[17px] w-[17px]" />}
            label="Registrar equipamento"
          />
        )}
      </div>

      {session?.role === "ADMIN" && (
        <div className="mt-3 flex flex-col gap-0.5 border-t border-slate-800 px-4 pb-2 pt-5">
          <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Administração
          </div>
          <SidebarNavLink
            href="/usuarios"
            icon={<UsersIcon className="h-[17px] w-[17px]" />}
            label="Usuários"
            prefixes={["/usuarios/"]}
          />
        </div>
      )}

      <div className="mt-auto flex items-center gap-2.5 border-t border-slate-800 px-6 pt-4">
        {session ? (
          <>
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
          </>
        ) : (
          <>
            <span className="min-w-0 flex-1 truncate text-[13px] text-slate-400">
              Visitante
            </span>
            <ThemeToggle />
            <Link
              href="/login"
              className="rounded-md px-2 py-1 text-xs font-medium text-teal-400 transition hover:bg-slate-800 hover:text-teal-300"
            >
              Entrar
            </Link>
          </>
        )}
      </div>
    </aside>
  );
}
