"use server";

import type { SeoPageStatus, SeoPageType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const SEO_PAGE_STATUSES: SeoPageStatus[] = [
  "DRAFT",
  "PUBLISHED",
  "PAUSED",
  "ARCHIVED",
];
const SEO_PAGE_TYPES: SeoPageType[] = ["CATEGORY", "ARTICLE", "SERVICE"];

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

function readPositiveInt(formData: FormData, key: string, fallback: number) {
  const value = Number(readString(formData, key));
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function validateSlug(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Slug должен быть латиницей в формате primer-stranicy");
  }
}

async function requireSeoManager() {
  const session = await getAdminSession();

  if (
    !session ||
    (session.role !== "BOSS" && !session.permissions.includes("offers_write"))
  ) {
    throw new Error("Недостаточно прав для управления SEO-страницами");
  }

  return session;
}

function collectSeoPageData(formData: FormData) {
  const slug = readString(formData, "slug");
  const status = readEnum(formData, "status", SEO_PAGE_STATUSES, "DRAFT");

  validateSlug(slug);

  return {
    slug,
    status,
    pageType: readEnum(formData, "pageType", SEO_PAGE_TYPES, "CATEGORY"),
    title: readString(formData, "title"),
    description: readString(formData, "description"),
    h1: readString(formData, "h1"),
    intro: readOptionalString(formData, "intro"),
    content: readOptionalString(formData, "content"),
    riskNotice: readOptionalString(formData, "riskNotice"),
    editorNote: readOptionalString(formData, "editorNote"),
    updatedByUserAt: new Date(),
  };
}

function validateSeoPagePublication(data: ReturnType<typeof collectSeoPageData>) {
  if (data.status !== "PUBLISHED") {
    return;
  }

  const missingFields: string[] = [];

  if (!data.slug) missingFields.push("Slug");
  if (!data.title) missingFields.push("Title");
  if (!data.description) missingFields.push("Description");
  if (!data.h1) missingFields.push("H1");
  if (!data.intro) missingFields.push("Intro");
  if (!data.riskNotice) missingFields.push("Предупреждение о рисках");

  if (missingFields.length > 0) {
    throw new Error(
      `Нельзя опубликовать страницу. Заполни поля: ${missingFields.join(", ")}.`,
    );
  }
}

function collectOfferLinks(formData: FormData) {
  return formData
    .getAll("offerId")
    .map((value, index) => {
      const offerId = String(value);

      return {
        offerId,
        position: readPositiveInt(formData, `offerPosition:${offerId}`, index + 1),
      };
    })
    .filter((item) => item.offerId.length > 0)
    .sort((first, second) => first.position - second.position);
}

function collectFaqItems(formData: FormData) {
  const questions = formData.getAll("faqQuestion").map((value) => String(value).trim());
  const answers = formData.getAll("faqAnswer").map((value) => String(value).trim());
  const positions = formData.getAll("faqPosition").map((value) => String(value).trim());

  return questions
    .map((question, index) => ({
      question,
      answer: answers[index] ?? "",
      position:
        Number.isInteger(Number(positions[index])) && Number(positions[index]) > 0
          ? Number(positions[index])
          : index + 1,
    }))
    .filter((item) => item.question.length > 0 && item.answer.length > 0)
    .sort((first, second) => first.position - second.position);
}

async function replaceSeoPageRelations(seoPageId: string, formData: FormData) {
  const offerLinks = collectOfferLinks(formData);
  const faqItems = collectFaqItems(formData);

  await prisma.$transaction([
    prisma.seoPageOffer.deleteMany({
      where: {
        seoPageId,
      },
    }),
    prisma.seoPageFaqItem.deleteMany({
      where: {
        seoPageId,
      },
    }),
    ...(offerLinks.length > 0
      ? [
          prisma.seoPageOffer.createMany({
            data: offerLinks.map((item) => ({
              seoPageId,
              offerId: item.offerId,
              position: item.position,
            })),
          }),
        ]
      : []),
    ...(faqItems.length > 0
      ? [
          prisma.seoPageFaqItem.createMany({
            data: faqItems.map((item) => ({
              seoPageId,
              question: item.question,
              answer: item.answer,
              position: item.position,
            })),
          }),
        ]
      : []),
  ]);
}

export async function createSeoPage(formData: FormData) {
  await requireSeoManager();

  const seoPageData = collectSeoPageData(formData);
  validateSeoPagePublication(seoPageData);

  if (!seoPageData.title || !seoPageData.description || !seoPageData.h1) {
    throw new Error("Title, description и H1 обязательны");
  }

  const seoPage = await prisma.seoPage.create({
    data: {
      ...seoPageData,
      publishedAt: seoPageData.status === "PUBLISHED" ? new Date() : null,
    },
  });

  await replaceSeoPageRelations(seoPage.id, formData);

  revalidatePath("/");
  revalidatePath(`/${seoPage.slug}`);
  revalidatePath("/admin");
  redirect(`/admin/seo/${seoPage.id}?saved=1`);
}

export async function updateSeoPage(formData: FormData) {
  await requireSeoManager();

  const seoPageId = readString(formData, "seoPageId");
  const seoPageData = collectSeoPageData(formData);
  validateSeoPagePublication(seoPageData);

  if (!seoPageId) {
    throw new Error("Не найден ID SEO-страницы");
  }

  const currentPage = await prisma.seoPage.findUnique({
    where: {
      id: seoPageId,
    },
  });

  if (!currentPage) {
    throw new Error("SEO-страница не найдена");
  }

  await prisma.seoPage.update({
    where: {
      id: seoPageId,
    },
    data: {
      ...seoPageData,
      publishedAt:
        seoPageData.status === "PUBLISHED"
          ? (currentPage.publishedAt ?? new Date())
          : currentPage.publishedAt,
    },
  });

  await replaceSeoPageRelations(seoPageId, formData);

  revalidatePath("/");
  revalidatePath(`/${currentPage.slug}`);
  revalidatePath(`/${seoPageData.slug}`);
  revalidatePath("/admin");
  revalidatePath(`/admin/seo/${seoPageId}`);
  redirect(`/admin/seo/${seoPageId}?saved=1`);
}
