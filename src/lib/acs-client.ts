import "server-only";
import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

// Cliente da API do ACS do cliente, compartilhado pelo registro manual de
// capacidades e pela descoberta em lote. Nenhuma função aqui redireciona:
// devolvem { ok: false, error } com a mensagem pronta para o usuário.

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

export type Failure = { ok: false; error: string };

export type AcsAuth = { base: string; accessToken: string; fromCache: boolean };

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

export function requiredString(value: unknown): string | null {
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

// Sessão já salva e ainda válida; null quando não há (ou expirou).
export async function getCachedAcsAuth(userId: string): Promise<AcsAuth | Failure | null> {
  const existing = await prisma.acsSession.findUnique({ where: { userId } });
  if (!existing || existing.expiresAt.getTime() - EXPIRY_SAFETY_MARGIN_MS <= Date.now()) {
    return null;
  }
  try {
    return {
      base: existing.domain,
      accessToken: decryptSecret(existing.accessTokenEncrypted),
      fromCache: true,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "erro desconhecido";
    return {
      ok: false,
      error: `Não foi possível recuperar a sessão salva com o ACS: ${reason}. Troque o domínio e autentique novamente.`,
    };
  }
}

// Autentica com client_id/client_secret e salva o token (criptografado)
// para os próximos usos. O client_secret nunca é armazenado.
export async function authenticateAcs(
  userId: string,
  domainRaw: string,
  clientId: string,
  clientSecret: string
): Promise<AcsAuth | Failure> {
  if (!domainRaw || !clientId || !clientSecret) {
    return { ok: false, error: "Domínio, client_id e client_secret são obrigatórios." };
  }

  const domain = parseDomain(domainRaw);
  if (!domain) {
    return { ok: false, error: "Domínio inválido. Informe algo como https://acs.seudominio.com.br." };
  }
  const hostname = domain.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(hostname) || hostname.startsWith("169.254.")) {
    return { ok: false, error: "Esse domínio não é permitido." };
  }
  const base = `${domain.protocol}//${domain.host}`;

  let tokenResponse: Response;
  try {
    tokenResponse = await fetchWithTimeout(`${base}/api/v2/token/oauth`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret }),
    });
  } catch {
    return { ok: false, error: "Não foi possível conectar ao domínio informado." };
  }

  if (!tokenResponse.ok) {
    return {
      ok: false,
      error: `Falha na autenticação (HTTP ${tokenResponse.status}). Verifique o client_id e o client_secret.`,
    };
  }

  let tokenBody: TokenApiResponse;
  try {
    tokenBody = (await tokenResponse.json()) as TokenApiResponse;
  } catch {
    return { ok: false, error: "Resposta inválida da rota de autenticação." };
  }

  const accessToken =
    typeof tokenBody.access_token === "string" ? tokenBody.access_token : undefined;
  if (!accessToken) {
    return { ok: false, error: "Token de acesso não encontrado na resposta da API." };
  }

  const expiresAt = parseExpiresAt(tokenBody);
  let accessTokenEncrypted: string;
  try {
    accessTokenEncrypted = encryptSecret(accessToken);
  } catch (error) {
    // A mensagem do erro aqui só fala sobre a configuração da chave em si
    // (ausente / tamanho errado) — não expõe nenhum segredo — e ajuda a
    // diagnosticar rápido sem precisar abrir os logs do Vercel.
    const reason = error instanceof Error ? error.message : "erro desconhecido";
    return { ok: false, error: `Não foi possível salvar a sessão com o ACS: ${reason}` };
  }

  await prisma.acsSession.upsert({
    where: { userId },
    update: { domain: base, accessTokenEncrypted, expiresAt },
    create: { userId, domain: base, accessTokenEncrypted, expiresAt },
  });

  return { base, accessToken, fromCache: false };
}

// Sessão salva que a API passou a recusar: descarta para pedir login de novo.
async function dropRejectedSession(auth: AcsAuth, userId: string) {
  if (auth.fromCache) {
    await prisma.acsSession.delete({ where: { userId } }).catch(() => {});
  }
}

const SESSION_REJECTED =
  "A sessão salva com o ACS não é mais válida. Informe o domínio e as credenciais novamente.";

// Consulta as capacidades de um SN e grava (upsert) o registro. A chave do
// registro vem da própria resposta da API (fabricante/modelo/hardware/firmware).
export async function fetchAndStoreCapabilities(
  auth: AcsAuth,
  userId: string,
  serialNumber: string
): Promise<
  | { ok: true; id: string; created: boolean }
  | (Failure & { sessionRejected?: boolean; noCapabilities?: boolean })
> {
  let capabilitiesResponse: Response;
  try {
    capabilitiesResponse = await fetchWithTimeout(
      `${auth.base}/api/v1/devices/capabilities?sn=${encodeURIComponent(serialNumber)}`,
      { headers: { Authorization: `Bearer ${auth.accessToken}` } }
    );
  } catch {
    return { ok: false, error: "Não foi possível consultar as capacidades do equipamento." };
  }

  if (capabilitiesResponse.status === 401 && auth.fromCache) {
    await dropRejectedSession(auth, userId);
    return { ok: false, error: SESSION_REJECTED, sessionRejected: true };
  }
  if (capabilitiesResponse.status === 404) {
    return { ok: false, error: "Nenhum equipamento encontrado para esse número de série." };
  }
  if (!capabilitiesResponse.ok) {
    return { ok: false, error: `Falha ao consultar capacidades (HTTP ${capabilitiesResponse.status}).` };
  }

  let data: CapabilitiesApiResponse;
  try {
    data = (await capabilitiesResponse.json()) as CapabilitiesApiResponse;
  } catch {
    return { ok: false, error: "Resposta inválida da rota de capacidades." };
  }

  const manufacturer = requiredString(data.device?.manufacturer);
  const modelName = requiredString(data.device?.modelName);
  const hardware = requiredString(data.device?.hardware);
  const firmwareVersion = requiredString(data.device?.firmwareVersion);
  const capabilities = data.capabilities;

  // O ACS reconhece o equipamento mas não tem capacidades cadastradas para
  // esse modelo/firmware: a resposta vem só com "device", sem "capabilities".
  if (manufacturer && modelName && hardware && firmwareVersion && data.capabilities == null) {
    const pkg = requiredString(data.device?.packageVersion);
    return {
      ok: false,
      noCapabilities: true,
      error: `O ACS não tem capacidades cadastradas para ${manufacturer} ${modelName} (hardware ${hardware}, firmware ${firmwareVersion}${pkg ? `, pacote ${pkg}` : ""}).`,
    };
  }

  const missing = [
    !manufacturer && "device.manufacturer",
    !modelName && "device.modelName",
    !hardware && "device.hardware",
    !firmwareVersion && "device.firmwareVersion",
    (!capabilities || typeof capabilities !== "object") && "capabilities",
  ].filter(Boolean);
  if (
    !manufacturer ||
    !modelName ||
    !hardware ||
    !firmwareVersion ||
    !capabilities ||
    typeof capabilities !== "object"
  ) {
    return {
      ok: false,
      error: `A resposta da API não contém os dados esperados de um equipamento (faltando: ${missing.join(", ")}).`,
    };
  }

  const productClass = requiredString(data.device?.productClass);
  const packageVersion = requiredString(data.device?.packageVersion);
  const datamodel = requiredString(data.device?.datamodel);
  const releaseDateRaw = requiredString(data.device?.releaseDate);
  const parsedReleaseDate = releaseDateRaw ? new Date(releaseDateRaw) : null;
  const releaseDate =
    parsedReleaseDate && !Number.isNaN(parsedReleaseDate.getTime()) ? parsedReleaseDate : null;
  const hasPackage = typeof data.hasPackage === "boolean" ? data.hasPackage : null;

  const key = { manufacturer, modelName, hardware, firmwareVersion };
  const existed = await prisma.equipmentCapability.findUnique({
    where: { manufacturer_modelName_hardware_firmwareVersion: key },
    select: { id: true },
  });

  const fields = {
    productClass,
    releaseDate,
    packageVersion,
    datamodel,
    hasPackage,
    serialNumber,
    capabilities,
  };
  const record = await prisma.equipmentCapability.upsert({
    where: { manufacturer_modelName_hardware_firmwareVersion: key },
    update: fields,
    create: { ...key, ...fields },
  });

  return { ok: true, id: record.id, created: !existed };
}

// Um equipamento da listagem do ACS reduzido ao que a descoberta usa — o
// registro completo traz dados de cliente (Wi-Fi, PPPoE, CPF) que não devem
// sair do servidor.
export type DiscoveredDevice = {
  serialNumber: string;
  manufacturer: string | null;
  modelName: string | null;
  hardware: string | null;
  firmwareVersion: string | null;
  online: boolean;
  lastInform: string | null;
  // versão do pacote do ACS para o modelo (v2, v3...) — só o v3 tem capacidades
  packageVersion: string | null;
};

type ListApiResponse = {
  hasNextPage?: unknown;
  registers?: unknown;
};

export const DEVICE_PAGE_SIZE = 50;

// Lista uma página de equipamentos (views/natural). Ordena por serialNumber
// (estável durante a varredura — lastInform muda enquanto as páginas são
// lidas e faria equipamentos pularem de página).
export async function listDevicesPage(
  auth: AcsAuth,
  userId: string,
  page: number
): Promise<
  | { ok: true; devices: DiscoveredDevice[]; hasNextPage: boolean }
  | (Failure & { sessionRejected?: boolean })
> {
  const params = new URLSearchParams({
    "pagination[pageSize]": String(DEVICE_PAGE_SIZE),
    "pagination[currentPage]": String(page),
    "sorting[sortBy]": "serialNumber",
    "sorting[sortOrder]": "asc",
  });

  let response: Response;
  try {
    response = await fetchWithTimeout(`${auth.base}/api/v2/devices/views/natural?${params}`, {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
  } catch {
    return { ok: false, error: `Não foi possível listar os equipamentos (página ${page}).` };
  }

  if (response.status === 401) {
    await dropRejectedSession(auth, userId);
    return { ok: false, error: SESSION_REJECTED, sessionRejected: true };
  }
  if (!response.ok) {
    return { ok: false, error: `Falha ao listar equipamentos (HTTP ${response.status}, página ${page}).` };
  }

  let body: ListApiResponse;
  try {
    body = (await response.json()) as ListApiResponse;
  } catch {
    return { ok: false, error: "Resposta inválida da listagem de equipamentos." };
  }
  if (!Array.isArray(body.registers)) {
    return { ok: false, error: "A listagem de equipamentos não veio no formato esperado." };
  }

  const devices: DiscoveredDevice[] = [];
  for (const raw of body.registers) {
    if (!raw || typeof raw !== "object") continue;
    const register = raw as Record<string, unknown>;
    const serialNumber = requiredString(register.serialNumber);
    if (!serialNumber) continue;
    const info =
      register.deviceInfo && typeof register.deviceInfo === "object"
        ? (register.deviceInfo as Record<string, unknown>)
        : {};
    devices.push({
      serialNumber,
      manufacturer: requiredString(info.manufacturer),
      modelName: requiredString(info.modelName),
      hardware: requiredString(info.hardwareVersion),
      firmwareVersion: requiredString(info.softwareVersion),
      online: register.status === true,
      lastInform: requiredString(register.lastInform),
      packageVersion: requiredString(info.packageVersion),
    });
  }

  return { ok: true, devices, hasNextPage: body.hasNextPage === true };
}
