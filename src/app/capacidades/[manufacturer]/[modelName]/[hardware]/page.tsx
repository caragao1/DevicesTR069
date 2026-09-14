import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ArrowLeftIcon } from "@/components/icons";

export default async function CapabilitiesFirmwarePage({
  params,
}: PageProps<"/capacidades/[manufacturer]/[modelName]/[hardware]">) {
  const {
    manufacturer: encodedManufacturer,
    modelName: encodedModel,
    hardware: encodedHardware,
  } = await params;
  const manufacturer = decodeURIComponent(encodedManufacturer);
  const modelName = decodeURIComponent(encodedModel);
  const hardware = decodeURIComponent(encodedHardware);

  const records = await prisma.equipmentCapability.findMany({
    where: { manufacturer, modelName, hardware },
    select: { id: true, firmwareVersion: true, updatedAt: true },
    orderBy: { firmwareVersion: "asc" },
  });
  if (records.length === 0) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/capacidades/${encodeURIComponent(manufacturer)}/${encodeURIComponent(modelName)}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Voltar para {manufacturer} {modelName}
        </Link>
        <h1 className="mt-3 font-serif text-2xl font-semibold text-stone-900 dark:text-stone-50">
          {hardware}
        </h1>
        <p className="text-sm text-stone-500 dark:text-slate-400">
          {records.length} firmware{records.length === 1 ? "" : "s"} registrado
          {records.length === 1 ? "" : "s"}
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {records.map((r) => (
          <li key={r.id}>
            <Link
              href={`/capacidades/registro/${r.id}`}
              className="flex items-center justify-between gap-4 rounded-xl border border-stone-200 bg-white p-4 transition hover:border-teal-200 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-900"
            >
              <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                {r.firmwareVersion}
              </span>
              <span className="text-xs text-stone-500 dark:text-slate-400">
                Atualizado em{" "}
                {r.updatedAt.toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
