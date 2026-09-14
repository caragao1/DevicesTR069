import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { ModelForm } from "@/components/ModelForm";
import { createModelAction } from "@/lib/actions/models";

export default async function NewModelPage({
  searchParams,
}: PageProps<"/models/new">) {
  await requireSession();
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const fabricante = typeof sp.fabricante === "string" ? sp.fabricante : undefined;

  const manufacturers = await prisma.deviceModel.findMany({
    select: { manufacturer: true },
    distinct: ["manufacturer"],
    orderBy: { manufacturer: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-50">
          Novo modelo
        </h1>
        <p className="text-sm text-stone-500 dark:text-slate-400">
          Cadastre um novo modelo de equipamento para registrar suas
          limitações.
        </p>
      </div>
      <ModelForm
        action={createModelAction}
        manufacturers={manufacturers.map((m) => m.manufacturer)}
        defaultValues={fabricante ? { manufacturer: fabricante } : undefined}
        error={error}
        submitLabel="Criar modelo"
      />
    </div>
  );
}
