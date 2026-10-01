import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { PlusIcon, SearchIcon } from "@/components/icons";
import { ScriptOperationBadge } from "@/components/ScriptOperationBadge";
import {
  SCRIPT_OPERATIONS,
  SCRIPT_OPERATION_LABELS,
  isScriptOperation,
  type ScriptOperation,
} from "@/lib/script-constants";

const selectClass =
  "rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-sm text-stone-700 dark:border-slate-800 dark:bg-slate-900 dark:text-stone-200";

export default async function ScriptsPage({ searchParams }: PageProps<"/scripts">) {
  await requireSession();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const operation =
    typeof sp.operation === "string" && isScriptOperation(sp.operation)
      ? sp.operation
      : null;

  const where: Prisma.ScriptWhereInput = {
    ...(operation ? { operation } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { code: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const scripts = await prisma.script.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      operation: true,
      config: true,
      updatedAt: true,
      createdBy: { select: { name: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-50">
            Scripts ACS
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-stone-500 dark:text-slate-400">
            Biblioteca de scripts de operação em massa (setar parâmetros,
            reapontar URL, excluir). Eles rodam no console do navegador com o
            painel do ACS aberto e logado.
          </p>
        </div>
        <Link
          href="/scripts/new"
          className="flex items-center gap-1.5 rounded-md bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Novo script
        </Link>
      </div>

      <form className="flex flex-wrap items-center gap-2" role="search">
        <div className="relative min-w-60 flex-1">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por título, descrição ou trecho do código"
            className="w-full rounded-md border border-stone-200 bg-white py-1.5 pl-8 pr-3 text-sm dark:border-slate-800 dark:bg-slate-900"
          />
        </div>
        <select name="operation" defaultValue={operation ?? ""} className={selectClass}>
          <option value="">Todas as operações</option>
          {SCRIPT_OPERATIONS.map((op) => (
            <option key={op} value={op}>
              {SCRIPT_OPERATION_LABELS[op]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-100 dark:border-slate-800 dark:text-stone-200 dark:hover:bg-slate-900"
        >
          Filtrar
        </button>
        {(q || operation) && (
          <Link
            href="/scripts"
            className="text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
          >
            Limpar
          </Link>
        )}
      </form>

      {scripts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500 dark:border-slate-700 dark:text-slate-400">
          {q || operation
            ? "Nenhum script encontrado com esses filtros."
            : "Nenhum script cadastrado ainda. Use “Novo script” para gerar um pelo assistente ou colar um que você já tem."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {scripts.map((script) => (
            <li key={script.id}>
              <Link
                href={`/scripts/${script.id}`}
                className="flex flex-col gap-1.5 rounded-xl border border-stone-200 bg-white p-4 transition hover:border-teal-600 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-500"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-stone-900 dark:text-stone-100">
                    {script.title}
                  </span>
                  <ScriptOperationBadge operation={script.operation as ScriptOperation} />
                  {script.config !== null && (
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-500 dark:bg-slate-800 dark:text-slate-400">
                      assistente
                    </span>
                  )}
                </div>
                {script.description && (
                  <p className="line-clamp-2 text-sm text-stone-600 dark:text-slate-400">
                    {script.description}
                  </p>
                )}
                <p className="text-xs text-stone-400 dark:text-slate-500">
                  Atualizado em {script.updatedAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                  {script.createdBy && ` · criado por ${script.createdBy.name}`}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
