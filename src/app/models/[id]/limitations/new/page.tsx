import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LimitationForm } from "@/components/LimitationForm";
import { createLimitationAction } from "@/lib/actions/limitations";
import { ArrowLeftIcon } from "@/components/icons";

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
          className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Voltar para {model.manufacturer} {model.modelName}
        </Link>
        <h1 className="mt-3 font-serif text-2xl font-semibold text-stone-900 dark:text-stone-50">
          Nova limitação
        </h1>
        <p className="text-sm text-stone-500 dark:text-slate-400">
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
