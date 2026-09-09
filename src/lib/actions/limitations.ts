"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { isCategory, isSeverity, isStatus } from "@/lib/constants";

function parseLimitationForm(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    category: String(formData.get("category") ?? "").trim(),
    severity: String(formData.get("severity") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    affectedFirmware:
      String(formData.get("affectedFirmware") ?? "").trim() || null,
    workaround: String(formData.get("workaround") ?? "").trim() || null,
    status: String(formData.get("status") ?? "CONHECIDO").trim(),
    referenceLink: String(formData.get("referenceLink") ?? "").trim() || null,
  };
}

function validateLimitation(data: ReturnType<typeof parseLimitationForm>) {
  if (!data.title || !data.description) {
    return "Título e descrição são obrigatórios.";
  }
  if (!isCategory(data.category)) {
    return "Categoria inválida.";
  }
  if (!isSeverity(data.severity)) {
    return "Severidade inválida.";
  }
  if (!isStatus(data.status)) {
    return "Status inválido.";
  }
  if (data.referenceLink) {
    try {
      new URL(data.referenceLink);
    } catch {
      return "Link de referência inválido (informe uma URL completa).";
    }
  }
  return null;
}

export async function createLimitationAction(
  deviceModelId: string,
  formData: FormData
) {
  await requireSession();
  const data = parseLimitationForm(formData);
  const error = validateLimitation(data);
  if (error) {
    redirect(
      `/models/${deviceModelId}/limitations/new?error=${encodeURIComponent(
        error
      )}`
    );
  }

  await prisma.limitation.create({ data: { ...data, deviceModelId } });
  redirect(`/models/${deviceModelId}`);
}

export async function updateLimitationAction(
  id: string,
  deviceModelId: string,
  formData: FormData
) {
  await requireSession();
  const data = parseLimitationForm(formData);
  const error = validateLimitation(data);
  if (error) {
    redirect(`/limitations/${id}/edit?error=${encodeURIComponent(error)}`);
  }

  await prisma.limitation.update({ where: { id }, data });
  redirect(`/models/${deviceModelId}`);
}

export async function deleteLimitationAction(
  id: string,
  deviceModelId: string
) {
  await requireSession();
  await prisma.limitation.delete({ where: { id } });
  redirect(`/models/${deviceModelId}`);
}
