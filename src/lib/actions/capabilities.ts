"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSession } from "@/lib/session";
import {
  authenticateAcs,
  fetchAndStoreCapabilities,
  getCachedAcsAuth,
  listDevicesPage,
  type DiscoveredDevice,
} from "@/lib/acs-client";

export async function registerEquipmentCapabilityAction(formData: FormData) {
  const session = await requireSession();

  const serialNumber = String(formData.get("serialNumber") ?? "").trim();

  const fail = (message: string) => {
    redirect(`/capacidades/registrar?error=${encodeURIComponent(message)}`);
  };

  if (!serialNumber) {
    fail("Número de série é obrigatório.");
    return;
  }

  let auth = await getCachedAcsAuth(session.userId);
  if (!auth) {
    auth = await authenticateAcs(
      session.userId,
      String(formData.get("domain") ?? "").trim(),
      String(formData.get("clientId") ?? "").trim(),
      String(formData.get("clientSecret") ?? "").trim()
    );
  }
  if ("ok" in auth) {
    fail(auth.error);
    return;
  }

  const result = await fetchAndStoreCapabilities(auth, session.userId, serialNumber);
  if (!result.ok) {
    fail(result.error);
    return;
  }

  redirect(`/capacidades/registro/${result.id}`);
}

export async function clearAcsSessionAction() {
  const session = await requireSession();
  await prisma.acsSession.delete({ where: { userId: session.userId } }).catch(() => {});
  redirect("/capacidades/registrar");
}

export async function deleteEquipmentCapabilityAction(id: string) {
  await requireAdmin();
  await prisma.equipmentCapability.delete({ where: { id } });
  redirect("/capacidades");
}

// ---- Descoberta em lote ----------------------------------------------------
// Chamadas uma a uma pelo navegador (uma página da listagem, um SN por vez),
// para nenhuma requisição estourar o tempo máximo de execução no Vercel e o
// progresso aparecer na tela.

export type DiscoveryFailure = {
  ok: false;
  error: string;
  needsLogin?: boolean;
  noCapabilities?: boolean;
};

export async function connectAcsAction(
  domain: string,
  clientId: string,
  clientSecret: string
): Promise<{ ok: true; domain: string } | DiscoveryFailure> {
  const session = await requireSession();
  const auth = await authenticateAcs(session.userId, domain.trim(), clientId.trim(), clientSecret.trim());
  if ("ok" in auth) return auth;
  return { ok: true, domain: auth.base };
}

export async function discoverDevicesPageAction(
  page: number
): Promise<{ ok: true; devices: DiscoveredDevice[]; hasNextPage: boolean } | DiscoveryFailure> {
  const session = await requireSession();
  if (!Number.isInteger(page) || page < 1) return { ok: false, error: "Página inválida." };

  const auth = await getCachedAcsAuth(session.userId);
  if (!auth) return { ok: false, error: "Conecte-se ao ACS para continuar.", needsLogin: true };
  if ("ok" in auth) return { ...auth, needsLogin: true };

  const result = await listDevicesPage(auth, session.userId, page);
  if (!result.ok) return { ok: false, error: result.error, needsLogin: result.sessionRejected };
  return result;
}

export async function registerCapabilityBySerialAction(
  serialNumber: string
): Promise<{ ok: true; id: string; created: boolean } | DiscoveryFailure> {
  const session = await requireSession();
  const sn = serialNumber.trim();
  if (!sn) return { ok: false, error: "Número de série é obrigatório." };

  const auth = await getCachedAcsAuth(session.userId);
  if (!auth) return { ok: false, error: "Conecte-se ao ACS para continuar.", needsLogin: true };
  if ("ok" in auth) return { ...auth, needsLogin: true };

  const result = await fetchAndStoreCapabilities(auth, session.userId, sn);
  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      needsLogin: result.sessionRejected,
      noCapabilities: result.noCapabilities,
    };
  }
  return result;
}
