"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

function parseModelForm(formData: FormData) {
  return {
    manufacturer: String(formData.get("manufacturer") ?? "").trim(),
    modelName: String(formData.get("modelName") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

export async function createModelAction(formData: FormData) {
  await requireSession();
  const { manufacturer, modelName, notes } = parseModelForm(formData);

  if (!manufacturer || !modelName) {
    redirect(
      `/models/new?error=${encodeURIComponent(
        "Fabricante e modelo são obrigatórios."
      )}`
    );
  }

  const existing = await prisma.deviceModel.findUnique({
    where: { manufacturer_modelName: { manufacturer, modelName } },
  });
  if (existing) {
    redirect(
      `/models/new?error=${encodeURIComponent(
        "Já existe um modelo cadastrado com esse fabricante e nome."
      )}`
    );
  }

  const created = await prisma.deviceModel.create({
    data: { manufacturer, modelName, notes },
  });
  redirect(`/models/${created.id}`);
}

export async function updateModelAction(id: string, formData: FormData) {
  await requireSession();
  const { manufacturer, modelName, notes } = parseModelForm(formData);

  if (!manufacturer || !modelName) {
    redirect(
      `/models/${id}/edit?error=${encodeURIComponent(
        "Fabricante e modelo são obrigatórios."
      )}`
    );
  }

  const existing = await prisma.deviceModel.findUnique({
    where: { manufacturer_modelName: { manufacturer, modelName } },
  });
  if (existing && existing.id !== id) {
    redirect(
      `/models/${id}/edit?error=${encodeURIComponent(
        "Já existe um modelo cadastrado com esse fabricante e nome."
      )}`
    );
  }

  await prisma.deviceModel.update({
    where: { id },
    data: { manufacturer, modelName, notes },
  });
  redirect(`/models/${id}`);
}

export async function deleteModelAction(id: string) {
  await requireSession();
  await prisma.deviceModel.delete({ where: { id } });
  redirect("/");
}
