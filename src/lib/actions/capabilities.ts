"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSession } from "@/lib/session";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

const FETCH_TIMEOUT_MS = 15_000;
const EXPIRY_SAFETY_MARGIN_MS = 30_000;

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

type TokenApiResponse = {
  access_token?: unknown;
  expires_in?: unknown;
  expires_at?: unknown;
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

function parseExpiresAt(tokenBody: TokenApiResponse): Date {
  if (typeof tokenBody.expires_at === "string") {
    const parsed = new Date(tokenBody.expires_at);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  if (typeof tokenBody.expires_in === "number" && Number.isFinite(tokenBody.expires_in)) {
    return new Date(Date.now() + tokenBody.expires_in * 1000);
  }
  // Fallback conservador quando a API não informa validade do token.
  return new Date(Date.now() + 5 * 60 * 1000);
}

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

  const existing = await prisma.acsSession.findUnique({ where: { userId: session.userId } });
  const hasValidSession =
    !!existing && existing.expiresAt.getTime() - EXPIRY_SAFETY_MARGIN_MS > Date.now();

  let base: string;
  let accessToken: string;
  const usedCachedSession = hasValidSession;

  if (hasValidSession && existing) {
    base = existing.domain;
    try {
      accessToken = decryptSecret(existing.accessTokenEncrypted);
    } catch {
      fail("Não foi possível recuperar a sessão salva com o ACS. Troque o domínio e autentique novamente.");
      return;
    }
  } else {
    const domainRaw = String(formData.get("domain") ?? "").trim();
    const clientId = String(formData.get("clientId") ?? "").trim();
    const clientSecret = String(formData.get("clientSecret") ?? "").trim();

    if (!domainRaw || !clientId || !clientSecret) {
      fail("Domínio, client_id e client_secret são obrigatórios.");
      return;
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
    base = `${domain.protocol}//${domain.host}`;

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

    let tokenBody: TokenApiResponse;
    try {
      tokenBody = (await tokenResponse.json()) as TokenApiResponse;
    } catch {
      fail("Resposta inválida da rota de autenticação.");
      return;
    }

    const newAccessToken =
      typeof tokenBody.access_token === "string" ? tokenBody.access_token : undefined;
    if (!newAccessToken) {
      fail("Token de acesso não encontrado na resposta da API.");
      return;
    }

    const expiresAt = parseExpiresAt(tokenBody);
    let accessTokenEncrypted: string;
    try {
      accessTokenEncrypted = encryptSecret(newAccessToken);
    } catch {
      fail("Não foi possível salvar a sessão com o ACS (configuração do servidor). Contate um administrador.");
      return;
    }

    await prisma.acsSession.upsert({
      where: { userId: session.userId },
      update: { domain: base, accessTokenEncrypted, expiresAt },
      create: { userId: session.userId, domain: base, accessTokenEncrypted, expiresAt },
    });

    accessToken = newAccessToken;
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

  if (capabilitiesResponse.status === 401 && usedCachedSession) {
    await prisma.acsSession.delete({ where: { userId: session.userId } }).catch(() => {});
    fail("A sessão salva com o ACS não é mais válida. Informe o domínio e as credenciais novamente.");
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
