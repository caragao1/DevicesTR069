import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SeverityBadge } from "@/components/Badges";
import { CpeIcon, PlusIcon, SearchIcon, ChevronRightIcon } from "@/components/icons";
import { SEVERITY_ORDER, type Severity } from "@/lib/constants";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const query = typeof sp.q === "string" ? sp.q.trim() : "";
  const fabricante = typeof sp.fabricante === "string" ? sp.fabricante : "";

  const where: Prisma.DeviceModelWhereInput = {};
  if (fabricante) where.manufacturer = fabricante;
  if (query) {
    where.OR = [
      { manufacturer: { contains: query } },
      { modelName: { contains: query } },
    ];
  }

  const models = await prisma.deviceModel.findMany({
    where,
    include: {
      limitations: { select: { severity: true } },
    },
    orderBy: [{ manufacturer: "asc" }, { modelName: "asc" }],
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-stone-900 dark:text-stone-50">
            Modelos de equipamentos
          </h1>
          <p className="mt-1.5 text-sm text-stone-500 dark:text-slate-400">
            Consulte as limitações e problemas conhecidos por fabricante e
            modelo cadastrados no IXC ACS.
          </p>
          {fabricante && (
            <p className="mt-2 text-sm text-stone-600 dark:text-slate-300">
              Fabricante:{" "}
              <span className="font-semibold text-teal-700 dark:text-teal-400">
                {fabricante}
              </span>{" "}
              ·{" "}
              <Link
                href="/"
                className="text-teal-700 hover:underline dark:text-teal-400"
              >
                limpar filtro
              </Link>
            </p>
          )}
        </div>
        <Link
          href="/models/new"
          className="flex items-center gap-1.5 whitespace-nowrap rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          <PlusIcon className="h-4 w-4" />
          Novo modelo
        </Link>
      </div>

      <form className="flex gap-2" action="/">
        {fabricante && (
          <input type="hidden" name="fabricante" value={fabricante} />
        )}
        <div className="flex flex-1 items-center gap-2.5 rounded-lg border border-stone-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900">
          <SearchIcon className="h-4 w-4 shrink-0 text-stone-400 dark:text-slate-500" />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Buscar por fabricante ou modelo…"
            className="w-full bg-transparent text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none dark:text-stone-100 dark:placeholder:text-slate-500"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
        >
          Buscar
        </button>
      </form>

      {models.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500 dark:border-slate-700 dark:text-slate-400">
          {query || fabricante
            ? "Nenhum modelo encontrado para essa busca."
            : "Nenhum modelo cadastrado ainda."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {models.map((model) => {
            const worst = model.limitations.reduce<Severity | null>(
              (acc, l) => {
                const sev = l.severity as Severity;
                if (!acc) return sev;
                return SEVERITY_ORDER[sev] < SEVERITY_ORDER[acc] ? sev : acc;
              },
              null
            );
            const count = model.limitations.length;
            return (
              <li key={model.id}>
                <Link
                  href={`/models/${model.id}`}
                  className="flex items-center gap-4 rounded-xl border border-stone-200 bg-white px-4.5 py-4 transition hover:border-teal-200 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-900"
                >
                  <div className="flex h-10.5 w-10.5 shrink-0 items-center justify-center rounded-lg bg-amber-50 dark:bg-slate-800">
                    <CpeIcon className="h-5 w-5 text-amber-700 dark:text-amber-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-stone-900 dark:text-stone-100">
                      {model.manufacturer} {model.modelName}
                    </p>
                    <p className="mt-0.5 text-xs text-stone-500 dark:text-slate-400">
                      {count === 0
                        ? "Nenhuma limitação registrada"
                        : `${count} limitaç${count === 1 ? "ão" : "ões"} registrada${count === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  {worst && <SeverityBadge severity={worst} />}
                  <ChevronRightIcon className="h-4 w-4 shrink-0 text-stone-300 dark:text-slate-600" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
