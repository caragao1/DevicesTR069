import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LimitationForm } from "@/components/LimitationForm";
import { updateLimitationAction } from "@/lib/actions/limitations";

export default async function EditLimitationPage({
  params,
  searchParams,
}: PageProps<"/limitations/[id]/edit">) {
  const { id } = await params;
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;

  const limitation = await prisma.limitation.findUnique({
    where: { id },
    include: { deviceModel: true },
  });
  if (!limitation) notFound();

  const updateLimitationWithId = updateLimitationAction.bind(
    null,
    limitation.id,
    limitation.deviceModelId
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/models/${limitation.deviceModelId}`}
          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          ← Voltar para {limitation.deviceModel.manufacturer}{" "}
          {limitation.deviceModel.modelName}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Editar limitação
        </h1>
      </div>
      <LimitationForm
        action={updateLimitationWithId}
        defaultValues={limitation}
        error={error}
        submitLabel="Salvar alterações"
      />
    </div>
  );
}
