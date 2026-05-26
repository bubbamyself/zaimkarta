"use server";

import { Prisma, type SeoToolStatus, type SeoToolType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  SEO_TOOL_STATUSES,
  SEO_TOOL_TYPES,
  defaultConfigForToolType,
  parseJsonObject,
  validateSeoToolConfig,
} from "@/lib/seo-tool-config";

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readOptionalString(formData: FormData, key: string) {
  const value = readString(formData, key);
  return value.length > 0 ? value : null;
}

function readEnum<T extends string>(
  formData: FormData,
  key: string,
  allowed: T[],
  fallback: T,
) {
  const value = readString(formData, key) as T;
  return allowed.includes(value) ? value : fallback;
}

function validateSlug(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Slug должен быть латиницей в формате primer-instrumenta");
  }
}

async function requireSeoManager() {
  const session = await getAdminSession();

  if (
    !session ||
    (session.role !== "BOSS" && !session.permissions.includes("offers_write"))
  ) {
    throw new Error("Недостаточно прав для управления инструментами");
  }

  return session;
}

function collectSeoToolData(formData: FormData) {
  const slug = readString(formData, "slug");
  const type = readEnum<SeoToolType>(
    formData,
    "type",
    SEO_TOOL_TYPES,
    "OVERPAYMENT_CALCULATOR",
  );
  const status = readEnum<SeoToolStatus>(
    formData,
    "status",
    SEO_TOOL_STATUSES,
    "DRAFT",
  );
  const rawConfig = readString(formData, "config");
  const config = rawConfig
    ? parseJsonObject(rawConfig, "Config")
    : defaultConfigForToolType(type);
  const rawDefaultBlock = readString(formData, "defaultBlock");

  validateSlug(slug);
  validateSeoToolConfig({ type, status, config });

  return {
    slug,
    type,
    status,
    name: readString(formData, "name"),
    title: readString(formData, "title"),
    description: readOptionalString(formData, "description"),
    config,
    defaultBlock: rawDefaultBlock
      ? parseJsonObject(rawDefaultBlock, "Default block")
      : null,
  };
}

function validateRequiredToolFields(data: ReturnType<typeof collectSeoToolData>) {
  const missingFields: string[] = [];

  if (!data.slug) missingFields.push("Slug");
  if (!data.name) missingFields.push("Название");
  if (!data.title) missingFields.push("Заголовок");
  if (!data.type) missingFields.push("Тип");

  if (missingFields.length > 0) {
    throw new Error(`Заполни поля: ${missingFields.join(", ")}.`);
  }
}

export async function createSeoTool(formData: FormData) {
  await requireSeoManager();

  const data = collectSeoToolData(formData);
  validateRequiredToolFields(data);

  const seoTool = await prisma.seoTool.create({
    data: {
      ...data,
      config: data.config as Prisma.InputJsonValue,
      defaultBlock: data.defaultBlock
        ? (data.defaultBlock as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    },
  });

  revalidatePath("/admin");
  redirect(`/admin/tools/${seoTool.id}?saved=1`);
}

export async function updateSeoTool(formData: FormData) {
  await requireSeoManager();

  const seoToolId = readString(formData, "seoToolId");
  const data = collectSeoToolData(formData);
  validateRequiredToolFields(data);

  if (!seoToolId) {
    throw new Error("Не найден ID инструмента");
  }

  if (data.status === "ARCHIVED") {
    const publishedUsages = await prisma.seoPageTool.count({
      where: {
        toolId: seoToolId,
        page: {
          status: "PUBLISHED",
        },
      },
    });

    if (publishedUsages > 0) {
      throw new Error(
        "Нельзя архивировать инструмент, который используется на опубликованных страницах.",
      );
    }
  }

  await prisma.seoTool.update({
    where: {
      id: seoToolId,
    },
    data: {
      ...data,
      config: data.config as Prisma.InputJsonValue,
      defaultBlock: data.defaultBlock
        ? (data.defaultBlock as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    },
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/tools/${seoToolId}`);
  redirect(`/admin/tools/${seoToolId}?saved=1`);
}
