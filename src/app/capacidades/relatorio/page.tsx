import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buildCapabilityMatrix, chunkColumns, type MatrixCell } from "@/lib/capability-matrix";
import { PrintButton } from "@/components/PrintButton";

function parseIds(value: string | string[] | undefined): string[] {
  if (typeof value !== "string") return [];
  return [...new Set(value.split(",").map((id) => id.trim()).filter(Boolean))];
}

// Só neste relatório: folha deitada e cores de fundo (✓/✕, faixas) na impressão
const PRINT_STYLE = `
@media print {
  @page { size: A4 landscape; margin: 10mm; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { background: #fff !important; }
}
`;

function Cell({ value }: { value: MatrixCell }) {
  if (value === null) {
    return (
      <span
        title="Não informado pelo ACS"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-stone-100 text-[10px] font-bold text-stone-400 dark:bg-slate-800 dark:text-slate-500"
      >
        –
      </span>
    );
  }
  return value ? (
    <span
      title="Suportado"
      className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
    >
      ✓
    </span>
  ) : (
    <span
      title="Não suportado"
      className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-700 dark:bg-red-950 dark:text-red-300"
    >
      ✕
    </span>
  );
}

function DiffTag() {
  return (
    <span className="ml-1.5 rounded bg-amber-200 px-1 py-px text-[10px] font-medium text-amber-900 dark:bg-amber-900 dark:text-amber-200">
      difere
    </span>
  );
}

export default async function CapabilitiesReportPage({
  searchParams,
}: PageProps<"/capacidades/relatorio">) {
  const sp = await searchParams;
  const ids = parseIds(sp.ids);
  const onlyDiff = sp.diff === "1";

  const found = ids.length
    ? await prisma.equipmentCapability.findMany({ where: { id: { in: ids } } })
    : [];
  const byId = new Map(found.map((r) => [r.id, r]));
  const records = ids.map((id) => byId.get(id)).filter((r): r is NonNullable<typeof r> => Boolean(r));

  const matrix = buildCapabilityMatrix(records);
  const groups = matrix.groups
    .map((group) => ({ ...group, rows: onlyDiff ? group.rows.filter((r) => r.differs) : group.rows }))
    .filter((group) => group.rows.length > 0);
  const blocks = chunkColumns(matrix.columns.length);
  const diffCount = matrix.groups.reduce((n, g) => n + g.rows.filter((r) => r.differs).length, 0);

  const generatedAt = new Date().toLocaleString("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });
  const plural = records.length === 1 ? "" : "s";
  const toggleHref = `/capacidades/relatorio?ids=${encodeURIComponent(ids.join(","))}${onlyDiff ? "" : "&diff=1"}`;

  return (
    <div className="flex w-full flex-col gap-5 pb-16 print:gap-2 print:pb-0">
      <style>{PRINT_STYLE}</style>

      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-50">
            Comparativo de capacidades
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">
            {records.length} equipamento{plural} — gerado em {generatedAt}
          </p>
        </div>
        {records.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {records.length > 1 && (
              <Link
                href={toggleHref}
                className="rounded-md border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100 dark:border-slate-800 dark:text-stone-200 dark:hover:bg-slate-900"
              >
                {onlyDiff ? "Mostrar todos os recursos" : `Só as diferenças (${diffCount})`}
              </Link>
            )}
            <PrintButton />
          </div>
        )}
      </div>

      {records.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500 dark:border-slate-700 dark:text-slate-400">
          Nenhum equipamento encontrado para este relatório.
        </p>
      ) : (
        <>
          <div className="hidden items-end justify-between border-b-[3px] border-teal-700 pb-2 print:flex">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-stone-500">
                IXC ACS · Central de Equipamentos
              </p>
              <h1 className="font-serif text-2xl font-semibold text-stone-900">
                Comparativo de capacidades
              </h1>
            </div>
            <p className="text-right text-xs text-stone-600">
              {records.length} equipamento{plural} · gerado em {generatedAt}
              <br />
              Fonte: API do ACS (/api/v1/devices/capabilities), resumo por grupo
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-600 dark:text-slate-400">
            <span className="flex items-center gap-1"><Cell value={true} /> suportado</span>
            <span className="flex items-center gap-1"><Cell value={false} /> não suportado</span>
            <span className="flex items-center gap-1"><Cell value={null} /> não informado pelo ACS</span>
            <span className="flex items-center gap-1">
              <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                15/20
              </span>
              recursos suportados
            </span>
            {records.length > 1 && (
              <span className="flex items-center">
                <DiffTag />
                <span className="ml-1">os equipamentos não são iguais nesse recurso</span>
              </span>
            )}
            {onlyDiff && (
              <span className="font-semibold text-amber-800 dark:text-amber-300">
                Mostrando só os recursos em que há diferença.
              </span>
            )}
          </div>

          {groups.length === 0 ? (
            <p className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500 dark:border-slate-700 dark:text-slate-400">
              Nenhuma diferença: todos os equipamentos têm os mesmos recursos.
            </p>
          ) : (
            blocks.map((block, blockIndex) => (
              <section key={blockIndex} className={blockIndex > 0 ? "break-before-page" : ""}>
                {blocks.length > 1 && (
                  <h2 className="mb-2 text-sm font-semibold print:mb-1 print:text-xs text-stone-700 dark:text-stone-200">
                    Equipamentos {block[0] + 1}–{block[block.length - 1] + 1} de {records.length}
                    <span className="ml-2 font-normal text-stone-500 dark:text-slate-400">
                      (&quot;difere&quot; compara todos os {records.length})
                    </span>
                  </h2>
                )}
                <div className="overflow-x-auto print:overflow-visible">
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr className="border-b-2 border-stone-900 dark:border-stone-300">
                        <th className="w-[13%] px-2 py-2 text-left align-bottom font-semibold text-stone-900 dark:text-stone-100">
                          Grupo
                        </th>
                        <th className="w-[22%] px-2 py-2 text-left align-bottom font-semibold text-stone-900 dark:text-stone-100">
                          Recurso
                        </th>
                        {block.map((col) => {
                          const column = matrix.columns[col];
                          return (
                            <th key={column.id} className="px-2 py-2 text-center align-bottom font-normal print:py-1">
                              <span className="block text-[11px] text-stone-500 dark:text-slate-400">
                                {column.manufacturer}
                              </span>
                              <span className="block font-serif text-base font-semibold leading-tight print:text-sm text-stone-900 dark:text-stone-50">
                                {column.modelName}
                              </span>
                              <span className="block text-[10px] leading-snug text-stone-500 dark:text-slate-400">
                                HW {column.hardware}
                                <br />
                                FW {column.firmwareVersion}
                              </span>
                              <span className="mt-1 inline-block rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                                {column.supported}/{column.total}
                              </span>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    {groups.map((group) => (
                      <tbody
                        key={group.key}
                        className="break-inside-avoid border-t border-stone-300 dark:border-slate-700"
                      >
                        {group.rows.map((row, rowIndex) => (
                          <tr
                            key={row.label}
                            className={row.differs ? "bg-amber-50 dark:bg-amber-950/40" : ""}
                          >
                            {rowIndex === 0 && (
                              <td
                                rowSpan={group.rows.length}
                                className="bg-stone-50 px-2 py-0.5 align-top text-[10px] font-bold uppercase leading-tight tracking-wider text-stone-500 dark:bg-slate-900 dark:text-slate-400"
                              >
                                {group.label}
                              </td>
                            )}
                            <td className="border-b border-stone-100 px-2 py-px text-stone-800 dark:border-slate-800 dark:text-stone-200">
                              {row.label}
                              {row.differs && <DiffTag />}
                            </td>
                            {block.map((col) => (
                              <td
                                key={matrix.columns[col].id}
                                className="border-b border-stone-100 px-2 py-px text-center dark:border-slate-800"
                              >
                                <Cell value={row.cells[col]} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    ))}
                  </table>
                </div>
              </section>
            ))
          )}

        </>
      )}
    </div>
  );
}
