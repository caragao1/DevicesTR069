"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSession } from "@/lib/session";

const FETCH_TIMEOUT_MS = 15_000;

// Alvos óbvios que uma chamada com domínio livre (definido pelo usuário)
// não tem motivo legítimo de alcançar a partir do nosso servidor.
const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "169.254.169.254",
  "::1",
  "[::1]",
]);

type CapabilitiesApiResponse = {
  device?: {
    manufacturer?: unknown;
    modelName?: unknown;
    productClass?: unknown;
    firmwareVersion?: unknown;
    hardware?: unknown;
    releaseDate?: unknown;
    packageVersion?: unknown;
    datamodel?: unknown;
  };
  capabilities?: unknown;
  hasPackage?: unknown;
};

function parseDomain(raw: string): URL | null {
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function requiredString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export async function registerEquipmentCapabilityAction(formData: FormData) {
  await requireSession();

  const domainRaw = String(formData.get("domain") ?? "").trim();
  const clientId = String(formData.get("clientId") ?? "").trim();
  const clientSecret = String(formData.get("clientSecret") ?? "").trim();
  const serialNumber = String(formData.get("serialNumber") ?? "").trim();

  const fail = (message: string) => {
    redirect(`/capacidades/registrar?error=${encodeURIComponent(message)}`);
  };

  if (!domainRaw || !clientId || !clientSecret || !serialNumber) {
    fail("Todos os campos são obrigatórios.");
  }

  const domain = parseDomain(domainRaw);
  if (!domain) {
    fail("Domínio inválido. Informe algo como https://acs.seudominio.com.br.");
    return;
  }
  const hostname = domain.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(hostname) || hostname.startsWith("169.254.")) {
    fail("Esse domínio não é permitido.");
    return;
  }
  const base = `${domain.protocol}//${domain.host}`;

  let tokenResponse: Response;
  try {
    tokenResponse = await fetchWithTimeout(`${base}/api/v2/token/oauth`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
  } catch {
    fail("Não foi possível conectar ao domínio informado.");
    return;
  }

  if (!tokenResponse.ok) {
    fail(
      `Falha na autenticação (HTTP ${tokenResponse.status}). Verifique o client_id e o client_secret.`
    );
    return;
  }

  let tokenBody: unknown;
  try {
    tokenBody = await tokenResponse.json();
  } catch {
    fail("Resposta inválida da rota de autenticação.");
    return;
  }

  const accessToken =
    tokenBody && typeof tokenBody === "object" && "access_token" in tokenBody
      ? (tokenBody as Record<string, unknown>).access_token
      : undefined;

  if (typeof accessToken !== "string" || !accessToken) {
    fail("Token de acesso não encontrado na resposta da API.");
    return;
  }

  let capabilitiesResponse: Response;
  try {
    capabilitiesResponse = await fetchWithTimeout(
      `${base}/api/v1/devices/capabilities?sn=${encodeURIComponent(serialNumber)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
  } catch {
    fail("Não foi possível consultar as capacidades do equipamento.");
    return;
  }

  if (capabilitiesResponse.status === 404) {
    fail("Nenhum equipamento encontrado para esse número de série.");
    return;
  }
  if (!capabilitiesResponse.ok) {
    fail(`Falha ao consultar capacidades (HTTP ${capabilitiesResponse.status}).`);
    return;
  }

  let data: CapabilitiesApiResponse;
  try {
    data = (await capabilitiesResponse.json()) as CapabilitiesApiResponse;
  } catch {
    fail("Resposta inválida da rota de capacidades.");
    return;
  }

  const manufacturer = requiredString(data.device?.manufacturer);
  const modelName = requiredString(data.device?.modelName);
  const hardware = requiredString(data.device?.hardware);
  const firmwareVersion = requiredString(data.device?.firmwareVersion);
  const capabilities = data.capabilities;

  if (
    !manufacturer ||
    !modelName ||
    !hardware ||
    !firmwareVersion ||
    !capabilities ||
    typeof capabilities !== "object"
  ) {
    fail("A resposta da API não contém os dados esperados de um equipamento.");
    return;
  }

  const productClass = requiredString(data.device?.productClass);
  const packageVersion = requiredString(data.device?.packageVersion);
  const datamodel = requiredString(data.device?.datamodel);
  const releaseDateRaw = requiredString(data.device?.releaseDate);
  const releaseDate = releaseDateRaw ? new Date(releaseDateRaw) : null;
  const hasPackage = typeof data.hasPackage === "boolean" ? data.hasPackage : null;

  const record = await prisma.equipmentCapability.upsert({
    where: {
      manufacturer_modelName_hardware_firmwareVersion: {
        manufacturer,
        modelName,
        hardware,
        firmwareVersion,
      },
    },
    update: {
      productClass,
      releaseDate: releaseDate && !Number.isNaN(releaseDate.getTime()) ? releaseDate : null,
      packageVersion,
      datamodel,
      hasPackage,
      serialNumber,
      capabilities,
    },
    create: {
      manufacturer,
      modelName,
      productClass,
      hardware,
      firmwareVersion,
      releaseDate: releaseDate && !Number.isNaN(releaseDate.getTime()) ? releaseDate : null,
      packageVersion,
      datamodel,
      hasPackage,
      serialNumber,
      capabilities,
    },
  });

  redirect(`/capacidades/registro/${record.id}`);
}

export async function deleteEquipmentCapabilityAction(id: string) {
  await requireAdmin();
  await prisma.equipmentCapability.delete({ where: { id } });
  redirect("/capacidades");
}
