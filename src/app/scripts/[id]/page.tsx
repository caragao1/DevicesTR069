import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { deleteScriptAction } from "@/lib/actions/scripts";
import { CodeActions } from "@/components/CodeActions";
import { ConfirmDeleteForm } from "@/components/ConfirmDeleteForm";
import { ScriptOperationBadge } from "@/components/ScriptOperationBadge";
import { ArrowLeftIcon } from "@/components/icons";
import type { ScriptOperation } from "@/lib/script-constants";

const secondaryButtonClass =
  "rounded-md border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-100 dark:border-slate-800 dark:text-stone-200 dark:hover:bg-slate-900";

export default async function ScriptPage({ params }: PageProps<"/scripts/[id]">) {
  const session = await requireSession();
  const { id } = await params;
  const script = await prisma.script.findUnique({
    where: { id },
    include: { createdBy: { select: { name: true } } },
  });
  if (!script) notFound();

  const dateFormat = { timeZone: "America/Sao_Paulo" } as const;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/scripts"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Voltar para Scripts ACS
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-50">
                {script.title}
              </h1>
              <ScriptOperationBadge operation={script.operation as ScriptOperation} />
            </div>
            {script.description && (
              <p className="mt-1.5 max-w-2xl whitespace-pre-line text-sm text-stone-600 dark:text-slate-400">
                {script.description}
              </p>
            )}
            <p className="mt-2 text-xs text-stone-400 dark:text-slate-500">
              {script.createdBy && `Criado por ${script.createdBy.name} · `}
              criado em {script.createdAt.toLocaleString("pt-BR", dateFormat)} ·
              atualizado em {script.updatedAt.toLocaleString("pt-BR", dateFormat)}
              {script.config !== null && " · montado pelo assistente"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/scripts/${script.id}/edit`} className={secondaryButtonClass}>
              Editar
            </Link>
            <Link href={`/scripts/new?from=${script.id}`} className={secondaryButtonClass}>
              Duplicar
            </Link>
            {session.role === "ADMIN" && (
              <ConfirmDeleteForm
                action={deleteScriptAction.bind(null, script.id)}
                confirmMessage={`Excluir o script "${script.title}" da biblioteca?`}
                label="Excluir"
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Código</h2>
          <CodeActions code={script.code} title={script.title} />
        </div>
        <pre className="max-h-[40rem] overflow-auto rounded-lg bg-slate-900 p-4 font-mono text-xs leading-relaxed text-stone-100">
          {script.code}
        </pre>
        <p className="text-xs text-stone-500 dark:text-slate-400">
          Rode no console do navegador (F12) com o painel do ACS aberto e logado.
          Comece sempre com <code>DRY_RUN = true</code>.
        </p>
      </div>
    </div>
  );
}
