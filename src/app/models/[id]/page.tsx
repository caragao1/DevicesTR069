import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { deleteModelAction } from "@/lib/actions/models";
import { deleteLimitationAction } from "@/lib/actions/limitations";
import { SeverityBadge, StatusBadge, CategoryBadge } from "@/components/Badges";
import { ConfirmDeleteForm } from "@/components/ConfirmDeleteForm";
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
  "rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";

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
          href="/"
          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          ← Voltar para a lista
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {model.manufacturer} {model.modelName}
            </h1>
            {model.notes && (
              <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
                {model.notes}
              </p>
            )}
          </div>
          {session && (
            <div className="flex gap-2">
              <Link
                href={`/models/${model.id}/edit`}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
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
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Limitações conhecidas ({limitations.length})
        </h2>
        {session && (
          <Link
            href={`/models/${model.id}/limitations/new`}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            + Nova limitação
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
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Filtrar
        </button>
        {hasFilter && (
          <Link
            href={`/models/${model.id}`}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium dark:border-zinc-700"
          >
            Limpar filtros
          </Link>
        )}
      </form>

      {limitations.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
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
                className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
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
                        className="text-blue-600 hover:underline dark:text-blue-400"
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
                <h3 className="mt-2 font-semibold text-zinc-900 dark:text-zinc-100">
                  {limitation.title}
                </h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                  {limitation.description}
                </p>
                {limitation.affectedFirmware && (
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="font-medium">Firmware afetado:</span>{" "}
                    {limitation.affectedFirmware}
                  </p>
                )}
                {limitation.workaround && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                    <span className="font-medium">Workaround:</span>{" "}
                    {limitation.workaround}
                  </p>
                )}
                {limitation.referenceLink && (
                  <a
                    href={limitation.referenceLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Ver referência ↗
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
