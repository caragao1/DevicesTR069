"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { clearSessionCookie, setSessionCookie } from "@/lib/session";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutos

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");
  const safeNext = next.startsWith("/") ? next : "/";
  const loginUrl = `/login?next=${encodeURIComponent(safeNext)}`;

  if (!email || !password) {
    redirect(
      `${loginUrl}&error=${encodeURIComponent("Informe e-mail e senha.")}`
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    const minutes = Math.ceil(
      (user.lockedUntil.getTime() - Date.now()) / 60000
    );
    redirect(
      `${loginUrl}&error=${encodeURIComponent(
        `Muitas tentativas de login. Tente novamente em ${minutes} minuto${minutes === 1 ? "" : "s"}.`
      )}`
    );
  }

  const passwordMatches = user
    ? await bcrypt.compare(password, user.passwordHash)
    : false;

  if (!user || !passwordMatches) {
    if (user) {
      const failedAttempts = user.failedAttempts + 1;
      const lockingNow = failedAttempts >= MAX_FAILED_ATTEMPTS;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedAttempts: lockingNow ? 0 : failedAttempts,
          lockedUntil: lockingNow
            ? new Date(Date.now() + LOCKOUT_DURATION_MS)
            : null,
        },
      });
    }
    redirect(
      `${loginUrl}&error=${encodeURIComponent("E-mail ou senha inválidos.")}`
    );
  }

  if (user.failedAttempts > 0 || user.lockedUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockedUntil: null },
    });
  }

  await setSessionCookie({
    userId: user.id,
    email: user.email,
    name: user.name,
  });

  redirect(safeNext);
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
