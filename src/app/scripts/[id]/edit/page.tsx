import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { updateScriptAction } from "@/lib/actions/scripts";
import { ScriptEditor } from "@/components/ScriptEditor";
import { ArrowLeftIcon } from "@/components/icons";
import { isScriptOperation } from "@/lib/script-constants";
import { parseConfig } from "@/lib/script-generator";

export default async function EditScriptPage({ params }: PageProps<"/scripts/[id]/edit">) {
  await requireSession();
  const { id } = await params;
  const script = await prisma.script.findUnique({ where: { id } });
  if (!script) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/scripts/${script.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Voltar para o script
        </Link>
        <h1 className="mt-3 font-serif text-2xl font-semibold text-stone-900 dark:text-stone-50">
          Editar script
        </h1>
      </div>
      <ScriptEditor
        action={updateScriptAction.bind(null, script.id)}
        defaults={{
          title: script.title,
          description: script.description ?? "",
          operation: isScriptOperation(script.operation) ? script.operation : "OUTRO",
          code: script.code,
          config: parseConfig(script.config),
        }}
        submitLabel="Salvar alterações"
      />
    </div>
  );
}
