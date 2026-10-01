"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSession } from "@/lib/session";
import { isScriptOperation } from "@/lib/script-constants";
import {
  generateScript,
  parseConfig,
  validateConfig,
  type GeneratorConfig,
} from "@/lib/script-generator";

export type ScriptFormState = { error?: string };

type ScriptData = {
  title: string;
  description: string | null;
  operation: string;
  code: string;
  config: GeneratorConfig | null;
};

// O editor é um Client Component com bastante estado (tabela de parâmetros,
// código colado): devolver o erro via useActionState em vez de redirecionar
// com ?error evita perder o que foi digitado.
function parseScriptForm(formData: FormData): ScriptData | { error: string } {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const operation = String(formData.get("operation") ?? "");
  const rawConfig = String(formData.get("config") ?? "");

  if (!title) return { error: "O título é obrigatório." };
  if (!isScriptOperation(operation)) return { error: "Operação inválida." };

  // Script do gerador: o código é sempre regerado aqui a partir do config,
  // para o que fica salvo nunca divergir do formulário.
  if (rawConfig) {
    let config: GeneratorConfig | null = null;
    try {
      config = parseConfig(JSON.parse(rawConfig));
    } catch {
      config = null;
    }
    if (!config || config.operation !== operation) {
      return { error: "Configuração do gerador inválida." };
    }
    const errors = validateConfig(config);
    if (errors.length) return { error: errors.join(" ") };
    return { title, description, operation, code: generateScript(config), config };
  }

  const code = String(formData.get("code") ?? "");
  if (!code.trim()) return { error: "O código do script é obrigatório." };
  return { title, description, operation, code, config: null };
}

function configValue(config: GeneratorConfig | null) {
  return config ?? Prisma.DbNull;
}

export async function createScriptAction(
  _prev: ScriptFormState,
  formData: FormData
): Promise<ScriptFormState> {
  const session = await requireSession();
  const data = parseScriptForm(formData);
  if ("error" in data) return data;

  const created = await prisma.script.create({
    data: {
      ...data,
      config: configValue(data.config),
      createdById: session.userId,
    },
  });
  redirect(`/scripts/${created.id}`);
}

export async function updateScriptAction(
  id: string,
  _prev: ScriptFormState,
  formData: FormData
): Promise<ScriptFormState> {
  await requireSession();
  const data = parseScriptForm(formData);
  if ("error" in data) return data;

  await prisma.script.update({
    where: { id },
    data: { ...data, config: configValue(data.config) },
  });
  redirect(`/scripts/${id}`);
}

export async function deleteScriptAction(id: string) {
  await requireAdmin();
  await prisma.script.delete({ where: { id } });
  redirect("/scripts");
}
