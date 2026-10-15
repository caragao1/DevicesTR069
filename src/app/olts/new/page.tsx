import { requireAdmin } from "@/lib/session";
import { createOltAction } from "@/lib/actions/olts";
import { tentarCatalogo } from "@/lib/olt/agente";
import { opcoesDeDriver } from "@/lib/olt/drivers";
import { OltForm } from "@/components/olt/OltForm";

export default async function NovaOltPage({ searchParams }: PageProps<"/olts/new">) {
  await requireAdmin();
  const sp = await searchParams;
  const { catalogo, erro } = await tentarCatalogo();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-50">Cadastrar OLT</h1>
        <p className="text-sm text-stone-500 dark:text-slate-400">
          Informe como o agente de OLTs chega ao equipamento. Os comandos saem do agente, dentro da rede das OLTs.
        </p>
      </div>
      <OltForm
        action={createOltAction}
        drivers={opcoesDeDriver(catalogo)}
        erroCatalogo={erro}
        error={typeof sp.error === "string" ? sp.error : undefined}
        submitLabel="Cadastrar OLT"
      />
    </div>
  );
}
