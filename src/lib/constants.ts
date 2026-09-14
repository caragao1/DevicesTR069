export const CATEGORIES = [
  "WIFI",
  "PARAMETROS_TR069",
  "PROVISIONAMENTO",
  "VOZ_VOIP",
  "ATUALIZACAO_FIRMWARE",
  "DIAGNOSTICO",
  "SEGURANCA",
  "OUTRO",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  WIFI: "Wi-Fi",
  PARAMETROS_TR069: "Parâmetros TR-069",
  PROVISIONAMENTO: "Provisionamento",
  VOZ_VOIP: "Voz / VoIP",
  ATUALIZACAO_FIRMWARE: "Atualização de firmware",
  DIAGNOSTICO: "Diagnóstico",
  SEGURANCA: "Segurança",
  OUTRO: "Outro",
};

export const SEVERITIES = ["BAIXA", "MEDIA", "ALTA", "CRITICA"] as const;

export type Severity = (typeof SEVERITIES)[number];

export const SEVERITY_LABELS: Record<Severity, string> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
  CRITICA: "Crítica",
};

export const SEVERITY_ORDER: Record<Severity, number> = {
  CRITICA: 0,
  ALTA: 1,
  MEDIA: 2,
  BAIXA: 3,
};

export const STATUSES = ["CONHECIDO", "EM_ANALISE", "RESOLVIDO"] as const;

export type LimitationStatus = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<LimitationStatus, string> = {
  CONHECIDO: "Conhecido",
  EM_ANALISE: "Em análise",
  RESOLVIDO: "Resolvido",
};

export const ROLES = ["ADMIN", "MEMBRO"] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador",
  MEMBRO: "Membro",
};

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

export function isSeverity(value: string): value is Severity {
  return (SEVERITIES as readonly string[]).includes(value);
}

export function isStatus(value: string): value is LimitationStatus {
  return (STATUSES as readonly string[]).includes(value);
}
