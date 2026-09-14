import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ManufacturerIcon } from "@/components/ManufacturerIcon";

export default async function CapabilitiesManufacturersPage() {
  const records = await prisma.equipmentCapability.findMany({
    select: { manufacturer: true, modelName: true },
  });

  const summary = new Map<string, Set<string>>();
  for (const { manufacturer, modelName } of records) {
    const models = summary.get(manufacturer) ?? new Set<string>();
    models.add(modelName);
    summary.set(manufacturer, models);
  }
  const manufacturers = [...summary.entries()]
    .map(([manufacturer, models]) => ({ manufacturer, count: models.size }))
    .sort((a, b) => a.manufacturer.localeCompare(b.manufacturer));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-50">
          Equipamentos registrados
        </h1>
        <p className="mt-1.5 text-sm text-stone-500 dark:text-slate-400">
          Capacidades de hardware/firmware obtidas do ACS, organizadas por
          fabricante e modelo.
        </p>
      </div>

      {manufacturers.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500 dark:border-slate-700 dark:text-slate-400">
          Nenhum equipamento registrado ainda.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {manufacturers.map((m) => (
            <li key={m.manufacturer}>
              <Link
                href={`/capacidades/${encodeURIComponent(m.manufacturer)}`}
                className="flex aspect-square flex-col items-center justify-center gap-2.5 rounded-2xl border border-stone-200 bg-white p-4 text-center transition hover:border-teal-200 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-900"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-stone-100 dark:bg-slate-800">
                  <ManufacturerIcon manufacturer={m.manufacturer} className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    {m.manufacturer}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-slate-400">
                    {m.count} modelo{m.count === 1 ? "" : "s"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
