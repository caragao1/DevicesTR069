import { ModelForm } from "@/components/ModelForm";
import { createModelAction } from "@/lib/actions/models";

export default async function NewModelPage({
  searchParams,
}: PageProps<"/models/new">) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Novo modelo
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Cadastre um novo modelo de equipamento para registrar suas
          limitações.
        </p>
      </div>
      <ModelForm
        action={createModelAction}
        error={error}
        submitLabel="Criar modelo"
      />
    </div>
  );
}
