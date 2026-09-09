import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { SeverityBadge } from "@/components/Badges";
import { ManufacturerIcon } from "@/components/ManufacturerIcon";
import { ArrowLeftIcon, PlusIcon } from "@/components/icons";
import { SEVERITY_ORDER, type Severity } from "@/lib/constants";

export default async function ManufacturerModelsPage({
  params,
}: PageProps<"/fabricantes/[manufacturer]">) {
  const { manufacturer: encoded } = await params;
  const manufacturer = decodeURIComponent(encoded);
  const session = await getSession();

  const models = await prisma.deviceModel.findMany({
    where: { manufacturer },
    include: { limitations: { select: { severity: true } } },
    orderBy: { modelName: "asc" },
  });

  if (models.length === 0) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Voltar para fabricantes
        </Link>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-stone-100 dark:bg-slate-800">
              <ManufacturerIcon manufacturer={manufacturer} className="h-7 w-7" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-50">
                {manufacturer}
              </h1>
              <p className="text-sm text-stone-500 dark:text-slate-400">
                {models.length} modelo{models.length === 1 ? "" : "s"}{" "}
                cadastrado{models.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          {session && (
            <Link
              href={`/models/new?fabricante=${encodeURIComponent(manufacturer)}`}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              <PlusIcon className="h-4 w-4" />
              Novo modelo
            </Link>
          )}
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {models.map((model) => {
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
                <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  {model.modelName}
                </p>
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
  );
}
