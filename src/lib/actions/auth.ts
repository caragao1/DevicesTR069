"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { clearSessionCookie, setSessionCookie } from "@/lib/session";

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
  const passwordMatches = user
    ? await bcrypt.compare(password, user.passwordHash)
    : false;

  if (!user || !passwordMatches) {
    redirect(
      `${loginUrl}&error=${encodeURIComponent("E-mail ou senha inválidos.")}`
    );
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
