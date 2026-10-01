import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { createScriptAction } from "@/lib/actions/scripts";
import { ScriptEditor, type ScriptEditorDefaults } from "@/components/ScriptEditor";
import { ArrowLeftIcon } from "@/components/icons";
import { isScriptOperation } from "@/lib/script-constants";
import { parseConfig } from "@/lib/script-generator";

export default async function NewScriptPage({ searchParams }: PageProps<"/scripts/new">) {
  await requireSession();
  const sp = await searchParams;
  const fromId = typeof sp.from === "string" ? sp.from : undefined;

  // ?from=<id> duplica um script existente como ponto de partida
  const source = fromId ? await prisma.script.findUnique({ where: { id: fromId } }) : null;

  const defaults: ScriptEditorDefaults = source
    ? {
        title: `${source.title} (cópia)`,
        description: source.description ?? "",
        operation: isScriptOperation(source.operation) ? source.operation : "OUTRO",
        code: source.code,
        config: parseConfig(source.config),
      }
    : { title: "", description: "", operation: "SET_PARAMS", code: "", config: null };

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
        <h1 className="mt-3 font-serif text-2xl font-semibold text-stone-900 dark:text-stone-50">
          {source ? "Duplicar script" : "Novo script"}
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">
          Monte pelo assistente (setar parâmetros, reapontar URL ou excluir) ou
          cole um script que você já tem.
        </p>
      </div>
      <ScriptEditor action={createScriptAction} defaults={defaults} submitLabel="Salvar script" />
    </div>
  );
}
