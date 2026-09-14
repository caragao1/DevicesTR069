import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { LimitationForm } from "@/components/LimitationForm";
import { updateLimitationAction } from "@/lib/actions/limitations";
import { ArrowLeftIcon } from "@/components/icons";

export default async function EditLimitationPage({
  params,
  searchParams,
}: PageProps<"/limitations/[id]/edit">) {
  await requireSession();
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
          className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Voltar para {limitation.deviceModel.manufacturer}{" "}
          {limitation.deviceModel.modelName}
        </Link>
        <h1 className="mt-3 font-serif text-2xl font-semibold text-stone-900 dark:text-stone-50">
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
