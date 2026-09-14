import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ManufacturerIcon } from "@/components/ManufacturerIcon";
import { ArrowLeftIcon } from "@/components/icons";

export default async function CapabilitiesModelsPage({
  params,
}: PageProps<"/capacidades/[manufacturer]">) {
  const { manufacturer: encoded } = await params;
  const manufacturer = decodeURIComponent(encoded);

  const records = await prisma.equipmentCapability.findMany({
    where: { manufacturer },
    select: { modelName: true, hardware: true },
  });
  if (records.length === 0) notFound();

  const summary = new Map<string, Set<string>>();
  for (const { modelName, hardware } of records) {
    const hardwares = summary.get(modelName) ?? new Set<string>();
    hardwares.add(hardware);
    summary.set(modelName, hardwares);
  }
  const models = [...summary.entries()]
    .map(([modelName, hardwares]) => ({ modelName, count: hardwares.size }))
    .sort((a, b) => a.modelName.localeCompare(b.modelName));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/capacidades"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Voltar para fabricantes
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-stone-100 dark:bg-slate-800">
            <ManufacturerIcon manufacturer={manufacturer} className="h-7 w-7" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-50">
              {manufacturer}
            </h1>
            <p className="text-sm text-stone-500 dark:text-slate-400">
              {models.length} modelo{models.length === 1 ? "" : "s"} registrado
              {models.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {models.map((m) => (
          <li key={m.modelName}>
            <Link
              href={`/capacidades/${encodeURIComponent(manufacturer)}/${encodeURIComponent(m.modelName)}`}
              className="flex aspect-square flex-col items-center justify-center gap-2.5 rounded-2xl border border-stone-200 bg-white p-4 text-center transition hover:border-teal-200 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-900"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-stone-100 dark:bg-slate-800">
                <ManufacturerIcon manufacturer={manufacturer} className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  {m.modelName}
                </p>
                <p className="text-xs text-stone-500 dark:text-slate-400">
                  {m.count} versão{m.count === 1 ? "" : "ões"} de hardware
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
