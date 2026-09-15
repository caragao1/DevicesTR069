import "server-only";
import { prisma } from "@/lib/prisma";

const EXPIRY_SAFETY_MARGIN_MS = 30_000;

export type ActiveAcsSession = {
  domain: string;
  expiresAt: Date;
};

// Usado pela página de registro para decidir se mostra o formulário
// completo (domínio + credenciais) ou o formulário reduzido (reaproveitando
// a sessão já autenticada). Nunca expõe o token em si — só metadados.
export async function getActiveAcsSession(userId: string): Promise<ActiveAcsSession | null> {
  const session = await prisma.acsSession.findUnique({ where: { userId } });
  if (!session) return null;
  if (session.expiresAt.getTime() - EXPIRY_SAFETY_MARGIN_MS <= Date.now()) return null;
  return { domain: session.domain, expiresAt: session.expiresAt };
}
