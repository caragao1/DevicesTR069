"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { isRole } from "@/lib/constants";

const MIN_PASSWORD_LENGTH = 8;

function parseUserForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
    password: String(formData.get("password") ?? ""),
    role: String(formData.get("role") ?? "MEMBRO").trim(),
  };
}

export async function createUserAction(formData: FormData) {
  await requireAdmin();
  const { name, email, password, role } = parseUserForm(formData);

  if (!name || !email || !password) {
    redirect(
      `/usuarios/new?error=${encodeURIComponent(
        "Nome, e-mail e senha são obrigatórios."
      )}`
    );
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    redirect(
      `/usuarios/new?error=${encodeURIComponent(
        `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`
      )}`
    );
  }
  if (!isRole(role)) {
    redirect(`/usuarios/new?error=${encodeURIComponent("Cargo inválido.")}`);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    redirect(
      `/usuarios/new?error=${encodeURIComponent(
        "Já existe um usuário com esse e-mail."
      )}`
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { name, email, passwordHash, role },
  });

  redirect("/usuarios");
}

async function countAdmins() {
  return prisma.user.count({ where: { role: "ADMIN" } });
}

export async function updateUserRoleAction(id: string, role: string) {
  await requireAdmin();

  if (!isRole(role)) {
    redirect(`/usuarios?error=${encodeURIComponent("Cargo inválido.")}`);
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    redirect(`/usuarios?error=${encodeURIComponent("Usuário não encontrado.")}`);
  }

  if (target.role === "ADMIN" && role !== "ADMIN") {
    const adminCount = await countAdmins();
    if (adminCount <= 1) {
      redirect(
        `/usuarios?error=${encodeURIComponent(
          "Não é possível remover o último administrador do sistema."
        )}`
      );
    }
  }

  await prisma.user.update({ where: { id }, data: { role } });
  redirect("/usuarios");
}

export async function deleteUserAction(id: string) {
  const session = await requireAdmin();

  if (id === session.userId) {
    redirect(
      `/usuarios?error=${encodeURIComponent(
        "Você não pode excluir sua própria conta."
      )}`
    );
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    redirect(`/usuarios?error=${encodeURIComponent("Usuário não encontrado.")}`);
  }

  if (target.role === "ADMIN") {
    const adminCount = await countAdmins();
    if (adminCount <= 1) {
      redirect(
        `/usuarios?error=${encodeURIComponent(
          "Não é possível excluir o último administrador do sistema."
        )}`
      );
    }
  }

  await prisma.user.delete({ where: { id } });
  redirect("/usuarios");
}
