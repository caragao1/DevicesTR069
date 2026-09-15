import { prisma } from "@/lib/prisma";
import { summarizeCapabilities } from "@/lib/capability-summary";
import { PrintButton } from "@/components/PrintButton";

function parseIds(value: string | string[] | undefined): string[] {
  if (typeof value !== "string") return [];
  return [...new Set(value.split(",").map((id) => id.trim()).filter(Boolean))];
}

export default async function CapabilitiesReportPage({
  searchParams,
}: PageProps<"/capacidades/relatorio">) {
  const sp = await searchParams;
  const ids = parseIds(sp.ids);

  const found = ids.length
    ? await prisma.equipmentCapability.findMany({ where: { id: { in: ids } } })
    : [];
  const byId = new Map(found.map((r) => [r.id, r]));
  const records = ids.map((id) => byId.get(id)).filter((r): r is NonNullable<typeof r> => Boolean(r));

  const generatedAt = new Date().toLocaleString("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 pb-16">
      <div className="flex items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-50">
            Relatório de capacidades
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">
            {records.length} equipamento{records.length === 1 ? "" : "s"} — gerado em{" "}
            {generatedAt}
          </p>
        </div>
        <PrintButton />
      </div>

      {records.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500 dark:border-slate-700 dark:text-slate-400">
          Nenhum equipamento encontrado para este relatório.
        </p>
      ) : (
        <>
          <div className="hidden print:block">
            <h1 className="font-serif text-2xl font-semibold text-stone-900">
              Relatório de capacidades — IXC ACS
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              {records.length} equipamento{records.length === 1 ? "" : "s"} — gerado em{" "}
              {generatedAt}
            </p>
          </div>

          {records.map((record, index) => {
            const capabilities =
              record.capabilities && typeof record.capabilities === "object"
                ? (record.capabilities as Record<string, unknown>)
                : {};
            const groups = summarizeCapabilities(capabilities);

            return (
              <section
                key={record.id}
                className={
                  index < records.length - 1
                    ? "break-after-page border-b border-stone-200 pb-8 dark:border-slate-800"
                    : "pb-8"
                }
              >
                <div className="border-b border-stone-300 pb-3">
                  <h2 className="font-serif text-xl font-semibold text-stone-900 dark:text-stone-50">
                    {record.manufacturer} {record.modelName}
                  </h2>
                  <p className="mt-1 text-sm text-stone-600 dark:text-slate-400">
                    Hardware: {record.hardware} &nbsp;·&nbsp; Firmware: {record.firmwareVersion}
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                  {groups.map((group) => (
                    <div key={group.key} className="break-inside-avoid">
                      <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                        {group.groupLabel}
                      </p>
                      {group.headline.map((item) => (
                        <div
                          key={item.label}
                          className="flex items-center justify-between gap-3 border-b border-stone-100 py-1 text-sm"
                        >
                          <span className="text-stone-700">{item.label}</span>
                          <span
                            className={
                              item.supported
                                ? "shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700"
                                : "shrink-0 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-500"
                            }
                          >
                            {item.supported ? "✓ Suportado" : "— Não suportado"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
