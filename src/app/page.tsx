import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SeverityBadge } from "@/components/Badges";
import { ManufacturerIcon } from "@/components/ManufacturerIcon";
import { PlusIcon, SearchIcon } from "@/components/icons";
import { SEVERITY_ORDER, type Severity } from "@/lib/constants";

type ManufacturerSummary = {
  manufacturer: string;
  count: number;
  worst: Severity | null;
};

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const query = typeof sp.q === "string" ? sp.q.trim() : "";

  const allModels = await prisma.deviceModel.findMany({
    select: {
      id: true,
      manufacturer: true,
      modelName: true,
      limitations: { select: { severity: true } },
    },
    orderBy: [{ manufacturer: "asc" }, { modelName: "asc" }],
  });

  const summaryByManufacturer = new Map<string, ManufacturerSummary>();
  for (const model of allModels) {
    const worstOfModel = model.limitations.reduce<Severity | null>(
      (acc, l) => {
        const sev = l.severity as Severity;
        if (!acc) return sev;
        return SEVERITY_ORDER[sev] < SEVERITY_ORDER[acc] ? sev : acc;
      },
      null
    );
    const entry = summaryByManufacturer.get(model.manufacturer) ?? {
      manufacturer: model.manufacturer,
      count: 0,
      worst: null,
    };
    entry.count += 1;
    if (
      worstOfModel &&
      (!entry.worst || SEVERITY_ORDER[worstOfModel] < SEVERITY_ORDER[entry.worst])
    ) {
      entry.worst = worstOfModel;
    }
    summaryByManufacturer.set(model.manufacturer, entry);
  }
  const manufacturerSummaries = [...summaryByManufacturer.values()].sort(
    (a, b) => a.manufacturer.localeCompare(b.manufacturer)
  );

  const normalizedQuery = query.toLowerCase();
  const matchedManufacturers = query
    ? manufacturerSummaries.filter((m) =>
        m.manufacturer.toLowerCase().includes(normalizedQuery)
      )
    : manufacturerSummaries;
  const matchedModels = query
    ? allModels.filter((m) =>
        m.modelName.toLowerCase().includes(normalizedQuery)
      )
    : [];

  const hasResults = matchedManufacturers.length > 0 || matchedModels.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-stone-900 dark:text-stone-50">
            Fabricantes
          </h1>
          <p className="mt-1.5 text-sm text-stone-500 dark:text-slate-400">
            Escolha um fabricante para ver seus modelos e as limitações
            conhecidas.
          </p>
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
        <div className="flex flex-1 items-center gap-2.5 rounded-lg border border-stone-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900">
          <SearchIcon className="h-4 w-4 shrink-0 text-stone-400 dark:text-slate-500" />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Buscar fabricante ou modelo…"
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

      {query && !hasResults && (
        <p className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500 dark:border-slate-700 dark:text-slate-400">
          Nenhum fabricante ou modelo encontrado para essa busca.
        </p>
      )}

      {matchedManufacturers.length > 0 && (
        <div className="flex flex-col gap-3">
          {query && (
            <h2 className="text-sm font-semibold text-stone-500 dark:text-slate-400">
              Fabricantes
            </h2>
          )}
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {matchedManufacturers.map((m) => (
              <li key={m.manufacturer}>
                <Link
                  href={`/fabricantes/${encodeURIComponent(m.manufacturer)}`}
                  className="flex aspect-square flex-col items-center justify-center gap-2.5 rounded-2xl border border-stone-200 bg-white p-4 text-center transition hover:border-teal-200 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-900"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-stone-100 dark:bg-slate-800">
                    <ManufacturerIcon
                      manufacturer={m.manufacturer}
                      className="h-6 w-6"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                      {m.manufacturer}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-slate-400">
                      {m.count} modelo{m.count === 1 ? "" : "s"}
                    </p>
                  </div>
                  {m.worst ? (
                    <SeverityBadge severity={m.worst} />
                  ) : (
                    <span className="text-[11px] text-stone-400 dark:text-slate-500">
                      Sem limitações
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {matchedModels.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-stone-500 dark:text-slate-400">
            Modelos
          </h2>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {matchedModels.map((model) => {
              const worst = model.limitations.reduce<Severity | null>(
                (acc, l) => {
                  const sev = l.severity as Severity;
                  if (!acc) return sev;
                  return SEVERITY_ORDER[sev] < SEVERITY_ORDER[acc] ? sev : acc;
                },
                null
              );
              return (
                <li key={model.id}>
                  <Link
                    href={`/models/${model.id}`}
                    className="flex aspect-square flex-col items-center justify-center gap-2.5 rounded-2xl border border-stone-200 bg-white p-4 text-center transition hover:border-teal-200 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-900"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-stone-100 dark:bg-slate-800">
                      <ManufacturerIcon
                        manufacturer={model.manufacturer}
                        className="h-6 w-6"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                        {model.manufacturer}
                      </p>
                      <p className="text-xs text-stone-500 dark:text-slate-400">
                        {model.modelName}
                      </p>
                    </div>
                    {worst ? (
                      <SeverityBadge severity={worst} />
                    ) : (
                      <span className="text-[11px] text-stone-400 dark:text-slate-500">
                        Sem limitações
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {!query && manufacturerSummaries.length === 0 && (
        <p className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500 dark:border-slate-700 dark:text-slate-400">
          Nenhum modelo cadastrado ainda.
        </p>
      )}
    </div>
  );
}
