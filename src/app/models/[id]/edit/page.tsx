import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { ModelForm } from "@/components/ModelForm";
import { updateModelAction } from "@/lib/actions/models";

export default async function EditModelPage({
  params,
  searchParams,
}: PageProps<"/models/[id]/edit">) {
  await requireSession();
  const { id } = await params;
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;

  const model = await prisma.deviceModel.findUnique({ where: { id } });
  if (!model) notFound();

  const manufacturers = await prisma.deviceModel.findMany({
    select: { manufacturer: true },
    distinct: ["manufacturer"],
    orderBy: { manufacturer: "asc" },
  });

  const updateModelWithId = updateModelAction.bind(null, model.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-50">
          Editar modelo
        </h1>
        <p className="text-sm text-stone-500 dark:text-slate-400">
          {model.manufacturer} {model.modelName}
        </p>
      </div>
      <ModelForm
        action={updateModelWithId}
        manufacturers={manufacturers.map((m) => m.manufacturer)}
        defaultValues={model}
        error={error}
        submitLabel="Salvar alterações"
      />
    </div>
  );
}
