import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { deleteEquipmentCapabilityAction } from "@/lib/actions/capabilities";
import { ManufacturerIcon } from "@/components/ManufacturerIcon";
import { CapabilityTree } from "@/components/CapabilityTree";
import { ConfirmDeleteForm } from "@/components/ConfirmDeleteForm";
import { ArrowLeftIcon } from "@/components/icons";

export default async function CapabilityRecordPage({
  params,
}: PageProps<"/capacidades/registro/[id]">) {
  const { id } = await params;
  const session = await getSession();

  const record = await prisma.equipmentCapability.findUnique({ where: { id } });
  if (!record) notFound();

  const deleteWithId = deleteEquipmentCapabilityAction.bind(null, record.id);
  const capabilities =
    record.capabilities && typeof record.capabilities === "object"
      ? (record.capabilities as Record<string, unknown>)
      : {};

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/capacidades/${encodeURIComponent(record.manufacturer)}/${encodeURIComponent(record.modelName)}/${encodeURIComponent(record.hardware)}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Voltar para {record.hardware}
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-stone-100 dark:bg-slate-800">
              <ManufacturerIcon manufacturer={record.manufacturer} className="h-7 w-7" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-50">
                {record.manufacturer} {record.modelName}
              </h1>
              <p className="text-sm text-stone-500 dark:text-slate-400">
                {record.firmwareVersion}
              </p>
            </div>
          </div>
          {session?.role === "ADMIN" && (
            <ConfirmDeleteForm
              action={deleteWithId}
              confirmMessage={`Excluir o registro de capacidades de ${record.manufacturer} ${record.modelName} (${record.hardware} / ${record.firmwareVersion})?`}
              label="Excluir registro"
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-stone-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500">
            Hardware
          </p>
          <p className="mt-0.5 text-stone-800 dark:text-stone-200">{record.hardware}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500">
            Firmware
          </p>
          <p className="mt-0.5 text-stone-800 dark:text-stone-200">
            {record.firmwareVersion}
          </p>
        </div>
        {record.productClass && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500">
              Product class
            </p>
            <p className="mt-0.5 text-stone-800 dark:text-stone-200">
              {record.productClass}
            </p>
          </div>
        )}
        {record.datamodel && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500">
              Data model
            </p>
            <p className="mt-0.5 text-stone-800 dark:text-stone-200">{record.datamodel}</p>
          </div>
        )}
        {record.packageVersion && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500">
              Package version
            </p>
            <p className="mt-0.5 text-stone-800 dark:text-stone-200">
              {record.packageVersion}
            </p>
          </div>
        )}
        {record.releaseDate && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500">
              Data de lançamento
            </p>
            <p className="mt-0.5 text-stone-800 dark:text-stone-200">
              {record.releaseDate.toLocaleDateString("pt-BR")}
            </p>
          </div>
        )}
        {record.serialNumber && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500">
              Nº de série usado no registro
            </p>
            <p className="mt-0.5 text-stone-800 dark:text-stone-200">
              {record.serialNumber}
            </p>
          </div>
        )}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500">
            Atualizado em
          </p>
          <p className="mt-0.5 text-stone-800 dark:text-stone-200">
            {record.updatedAt.toLocaleDateString("pt-BR")}
          </p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-stone-900 dark:text-stone-50">
          Capacidades suportadas
        </h2>
        <CapabilityTree capabilities={capabilities} />
      </div>
    </div>
  );
}
