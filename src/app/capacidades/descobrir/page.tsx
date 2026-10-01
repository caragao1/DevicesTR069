import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { getActiveAcsSession } from "@/lib/acs-session";
import { capabilityKey } from "@/lib/capability-key";
import { CapabilityDiscovery } from "@/components/CapabilityDiscovery";

export default async function DiscoverCapabilitiesPage() {
  const session = await requireSession();
  const acsSession = await getActiveAcsSession(session.userId);

  const registered = await prisma.equipmentCapability.findMany({
    select: { manufacturer: true, modelName: true, hardware: true, firmwareVersion: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-50">
          Descobrir na base do ACS
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-stone-500 dark:text-slate-400">
          Lê todos os equipamentos do ACS, agrupa por fabricante, modelo,
          hardware e firmware e consulta as capacidades de um equipamento de
          cada combinação que ainda não está registrada. Da base do ACS só
          são lidos esses campos, o número de série e o status — dados de
          cliente não são armazenados.
        </p>
      </div>
      <CapabilityDiscovery
        initialDomain={acsSession?.domain ?? null}
        registeredKeys={registered.map(capabilityKey)}
      />
    </div>
  );
}
