import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LimitationForm } from "@/components/LimitationForm";
import { createLimitationAction } from "@/lib/actions/limitations";

export default async function NewLimitationPage({
  params,
  searchParams,
}: PageProps<"/models/[id]/limitations/new">) {
  const { id } = await params;
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;

  const model = await prisma.deviceModel.findUnique({ where: { id } });
  if (!model) notFound();

  const createLimitationWithId = createLimitationAction.bind(null, model.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/models/${model.id}`}
          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          ← Voltar para {model.manufacturer} {model.modelName}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Nova limitação
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {model.manufacturer} {model.modelName}
        </p>
      </div>
      <LimitationForm
        action={createLimitationWithId}
        error={error}
        submitLabel="Salvar limitação"
      />
    </div>
  );
}
