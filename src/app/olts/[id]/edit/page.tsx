import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { deleteOltAction, updateOltAction } from "@/lib/actions/olts";
import { tentarCatalogo } from "@/lib/olt/agente";
import { opcoesDeDriver } from "@/lib/olt/drivers";
import { OltForm } from "@/components/olt/OltForm";
import { ConfirmDeleteForm } from "@/components/ConfirmDeleteForm";

export default async function EditarOltPage({ params, searchParams }: PageProps<"/olts/[id]/edit">) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const olt = await prisma.olt.findUnique({ where: { id }, omit: { senhaEncrypted: true } });
  if (!olt) notFound();
  const { catalogo, erro } = await tentarCatalogo();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Editar cadastro</h2>
        <ConfirmDeleteForm
          action={deleteOltAction.bind(null, olt.id)}
          confirmMessage={`Excluir a OLT ${olt.nome} do cadastro, com coletas e histórico? Nada é alterado no equipamento.`}
          label="Excluir OLT"
        />
      </div>
      <OltForm
        action={updateOltAction.bind(null, olt.id)}
        drivers={opcoesDeDriver(catalogo)}
        erroCatalogo={erro}
        olt={olt}
        error={typeof sp.error === "string" ? sp.error : undefined}
        submitLabel="Salvar alterações"
      />
    </div>
  );
}
