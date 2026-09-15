import { prisma } from "@/lib/prisma";
import { CapacidadesExplorer, type CapabilityRecordSummary } from "@/components/CapacidadesExplorer";

function asString(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export default async function CapabilitiesExplorerPage({
  searchParams,
}: PageProps<"/capacidades">) {
  const sp = await searchParams;

  const records = await prisma.equipmentCapability.findMany({
    orderBy: [{ manufacturer: "asc" }, { modelName: "asc" }],
  });

  const recordSummaries: CapabilityRecordSummary[] = records.map((r) => ({
    id: r.id,
    manufacturer: r.manufacturer,
    modelName: r.modelName,
    hardware: r.hardware,
    firmwareVersion: r.firmwareVersion,
    updatedAt: r.updatedAt.toISOString(),
    capabilities:
      r.capabilities && typeof r.capabilities === "object"
        ? (r.capabilities as Record<string, unknown>)
        : {},
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-50">
          Capacidades de equipamentos
        </h1>
        <p className="mt-1.5 text-sm text-stone-500 dark:text-slate-400">
          Escolha fabricante, modelo, hardware e firmware para ver o que o
          equipamento suporta — sem sair desta página.
        </p>
      </div>

      {recordSummaries.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500 dark:border-slate-700 dark:text-slate-400">
          Nenhum equipamento registrado ainda.
        </p>
      ) : (
        <CapacidadesExplorer
          records={recordSummaries}
          initial={{
            manufacturer: asString(sp.manufacturer),
            modelName: asString(sp.modelName),
            hardware: asString(sp.hardware),
            firmwareVersion: asString(sp.firmwareVersion),
          }}
        />
      )}
    </div>
  );
}
