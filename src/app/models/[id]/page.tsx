import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { deleteModelAction } from "@/lib/actions/models";
import { deleteLimitationAction } from "@/lib/actions/limitations";
import { SeverityBadge, StatusBadge, CategoryBadge } from "@/components/Badges";
import { ConfirmDeleteForm } from "@/components/ConfirmDeleteForm";
import { ArrowLeftIcon, ExternalLinkIcon, PlusIcon } from "@/components/icons";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  SEVERITIES,
  SEVERITY_LABELS,
  SEVERITY_ORDER,
  STATUSES,
  STATUS_LABELS,
  isCategory,
  isSeverity,
  isStatus,
  type Category,
  type LimitationStatus,
  type Severity,
} from "@/lib/constants";

const selectClass =
  "rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-sm text-stone-700 dark:border-slate-800 dark:bg-slate-900 dark:text-stone-200";

export default async function ModelPage({
  params,
  searchParams,
}: PageProps<"/models/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const session = await getSession();

  const model = await prisma.deviceModel.findUnique({
    where: { id },
    include: { limitations: true },
  });
  if (!model) notFound();

  const categoryFilter =
    typeof sp.category === "string" && isCategory(sp.category)
      ? sp.category
      : null;
  const severityFilter =
    typeof sp.severity === "string" && isSeverity(sp.severity)
      ? sp.severity
      : null;
  const statusFilter =
    typeof sp.status === "string" && isStatus(sp.status) ? sp.status : null;
  const hasFilter = Boolean(categoryFilter || severityFilter || statusFilter);

  const limitations = model.limitations
    .filter((l) => !categoryFilter || l.category === categoryFilter)
    .filter((l) => !severityFilter || l.severity === severityFilter)
    .filter((l) => !statusFilter || l.status === statusFilter)
    .sort(
      (a, b) =>
        SEVERITY_ORDER[a.severity as Severity] -
        SEVERITY_ORDER[b.severity as Severity]
    );

  const deleteModelWithId = deleteModelAction.bind(null, model.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/fabricantes/${encodeURIComponent(model.manufacturer)}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Voltar para {model.manufacturer}
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-50">
              {model.manufacturer} {model.modelName}
            </h1>
            {model.notes && (
              <p className="mt-1.5 max-w-2xl text-sm text-stone-600 dark:text-slate-400">
                {model.notes}
              </p>
            )}
          </div>
          {session && (
            <div className="flex gap-2">
              <Link
                href={`/models/${model.id}/edit`}
                className="rounded-md border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-100 dark:border-slate-800 dark:text-stone-200 dark:hover:bg-slate-900"
              >
                Editar modelo
              </Link>
              <ConfirmDeleteForm
                action={deleteModelWithId}
                confirmMessage={`Excluir o modelo ${model.manufacturer} ${model.modelName} e todas as suas limitações?`}
                label="Excluir modelo"
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">
          Limitações conhecidas ({limitations.length})
        </h2>
        {session && (
          <Link
            href={`/models/${model.id}/limitations/new`}
            className="flex items-center gap-1.5 rounded-md bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Nova limitação
          </Link>
        )}
      </div>

      <form
        className="flex flex-wrap items-center gap-2"
        action={`/models/${model.id}`}
      >
        <select
          name="category"
          defaultValue={categoryFilter ?? ""}
          className={selectClass}
        >
          <option value="">Todas as categorias</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <select
          name="severity"
          defaultValue={severityFilter ?? ""}
          className={selectClass}
        >
          <option value="">Todas as severidades</option>
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {SEVERITY_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={statusFilter ?? ""}
          className={selectClass}
        >
          <option value="">Todos os status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-stone-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-stone-100 dark:text-stone-900"
        >
          Filtrar
        </button>
        {hasFilter && (
          <Link
            href={`/models/${model.id}`}
            className="rounded-md border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-700 dark:border-slate-800 dark:text-stone-200"
          >
            Limpar filtros
          </Link>
        )}
      </form>

      {limitations.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500 dark:border-slate-700 dark:text-slate-400">
          {hasFilter
            ? "Nenhuma limitação encontrada para esse filtro."
            : "Nenhuma limitação registrada para este modelo ainda."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {limitations.map((limitation) => {
            const deleteLimitationWithId = deleteLimitationAction.bind(
              null,
              limitation.id,
              model.id
            );
            return (
              <li
                key={limitation.id}
                className="rounded-xl border border-stone-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={limitation.severity as Severity} />
                    <StatusBadge status={limitation.status as LimitationStatus} />
                    <CategoryBadge category={limitation.category as Category} />
                  </div>
                  {session && (
                    <div className="flex items-center gap-3 text-xs">
                      <Link
                        href={`/limitations/${limitation.id}/edit`}
                        className="font-medium text-teal-700 hover:underline dark:text-teal-400"
                      >
                        Editar
                      </Link>
                      <ConfirmDeleteForm
                        action={deleteLimitationWithId}
                        confirmMessage={`Excluir a limitação "${limitation.title}"?`}
                        label="Excluir"
                        variant="link"
                      />
                    </div>
                  )}
                </div>
                <h3 className="mt-3 font-semibold text-stone-900 dark:text-stone-100">
                  {limitation.title}
                </h3>
                <p className="mt-1.5 whitespace-pre-wrap text-sm text-stone-700 dark:text-slate-300">
                  {limitation.description}
                </p>
                {limitation.affectedFirmware && (
                  <p className="mt-3 text-xs text-stone-500 dark:text-slate-400">
                    <span className="font-medium text-stone-600 dark:text-slate-300">
                      Firmware afetado:
                    </span>{" "}
                    {limitation.affectedFirmware}
                  </p>
                )}
                {limitation.workaround && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-stone-700 dark:text-slate-300">
                    <span className="font-medium text-stone-900 dark:text-stone-100">
                      Workaround:
                    </span>{" "}
                    {limitation.workaround}
                  </p>
                )}
                {limitation.referenceLink && (
                  <a
                    href={limitation.referenceLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:underline dark:text-teal-400"
                  >
                    Ver referência
                    <ExternalLinkIcon className="h-3 w-3" />
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
