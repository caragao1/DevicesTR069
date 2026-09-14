import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ArrowLeftIcon } from "@/components/icons";

export default async function CapabilitiesHardwarePage({
  params,
}: PageProps<"/capacidades/[manufacturer]/[modelName]">) {
  const { manufacturer: encodedManufacturer, modelName: encodedModel } = await params;
  const manufacturer = decodeURIComponent(encodedManufacturer);
  const modelName = decodeURIComponent(encodedModel);

  const records = await prisma.equipmentCapability.findMany({
    where: { manufacturer, modelName },
    select: { hardware: true },
  });
  if (records.length === 0) notFound();

  const hardwareCounts = new Map<string, number>();
  for (const { hardware } of records) {
    hardwareCounts.set(hardware, (hardwareCounts.get(hardware) ?? 0) + 1);
  }
  const hardwares = [...hardwareCounts.entries()]
    .map(([hardware, count]) => ({ hardware, count }))
    .sort((a, b) => a.hardware.localeCompare(b.hardware));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/capacidades/${encodeURIComponent(manufacturer)}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Voltar para {manufacturer}
        </Link>
        <h1 className="mt-3 font-serif text-2xl font-semibold text-stone-900 dark:text-stone-50">
          {manufacturer} {modelName}
        </h1>
        <p className="text-sm text-stone-500 dark:text-slate-400">
          {hardwares.length} versão{hardwares.length === 1 ? "" : "ões"} de hardware
          registrada{hardwares.length === 1 ? "" : "s"}
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {hardwares.map((h) => (
          <li key={h.hardware}>
            <Link
              href={`/capacidades/${encodeURIComponent(manufacturer)}/${encodeURIComponent(modelName)}/${encodeURIComponent(h.hardware)}`}
              className="flex items-center justify-between gap-4 rounded-xl border border-stone-200 bg-white p-4 transition hover:border-teal-200 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-900"
            >
              <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                {h.hardware}
              </span>
              <span className="text-xs text-stone-500 dark:text-slate-400">
                {h.count} firmware{h.count === 1 ? "" : "s"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
