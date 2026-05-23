"use server";

import type { ApprovalTone, OfferStatus } from "@prisma/client";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import path from "path";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const LOGO_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "logos");
const LOGO_PUBLIC_PATH = "/uploads/logos";
const MAX_LOGO_BYTES = 400 * 1024;
const OFFER_STATUSES: OfferStatus[] = ["ACTIVE", "PAUSED", "ARCHIVED"];
const APPROVAL_TONES: ApprovalTone[] = ["LOW", "MEDIUM", "HIGH"];

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function actionError(message: string) {
  return new Error(message);
}

function readOptionalString(formData: FormData, key: string) {
  const value = readString(formData, key);
  return value.length > 0 ? value : null;
}

function readInt(formData: FormData, key: string) {
  const value = readString(formData, key);

  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function readDecimal(formData: FormData, key: string) {
  const value = readString(formData, key).replace(",", ".");

  if (!value) {
    return null;
  }

  if (!/^\d+(\.\d+)?$/.test(value)) {
    throw new Error(`Некорректное число в поле ${key}`);
  }

  return value;
}

function readList(formData: FormData, key: string) {
  return readString(formData, key)
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function readEnum<T extends string>(formData: FormData, key: string, allowed: T[], fallback: T) {
  const value = readString(formData, key) as T;
  return allowed.includes(value) ? value : fallback;
}

function readDate(formData: FormData, key: string) {
  const value = readString(formData, key);

  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Некорректная дата в поле ${key}`);
  }

  return parsed;
}

function validateSlug(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw actionError("Slug должен быть латиницей в формате primer-offera");
  }
}

function validateHttpsUrl(value: string | null, label: string) {
  if (!value) {
    return;
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw actionError(`${label}: ссылка должна быть корректным URL`);
  }

  if (url.protocol !== "https:") {
    throw actionError(`${label}: используем только https-ссылки`);
  }
}

function validateSvgLogo(buffer: Buffer) {
  const svg = buffer.toString("utf8");

  if (!/<svg[\s>]/i.test(svg)) {
    throw new Error("Файл логотипа должен быть корректным SVG");
  }

  if (/<script|on\w+=|javascript:/i.test(svg)) {
    throw new Error("SVG не должен содержать скрипты или inline-обработчики");
  }
}

async function saveLogoUpload(formData: FormData, slug: string) {
  const file = formData.get("logoFile");

  if (!(file instanceof File) || file.size === 0) {
    return readOptionalString(formData, "currentLogoUrl");
  }

  if (file.type !== "image/svg+xml") {
    throw new Error("Логотип должен быть в формате SVG");
  }

  if (file.size > MAX_LOGO_BYTES) {
    throw new Error("Файл логотипа слишком большой. Достаточно до 400 КБ");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  validateSvgLogo(buffer);

  await mkdir(LOGO_UPLOAD_DIR, {
    recursive: true,
  });

  const safeSlug = slug.replace(/[^a-z0-9-]/g, "");
  const fileName = `${safeSlug}-${randomUUID()}.svg`;
  await writeFile(path.join(LOGO_UPLOAD_DIR, fileName), buffer);

  return `${LOGO_PUBLIC_PATH}/${fileName}`;
}

async function requireOfferManager() {
  const session = await getAdminSession();

  if (
    !session ||
    (session.role !== "BOSS" && !session.permissions.includes("offers_write"))
  ) {
    throw new Error("Недостаточно прав для управления офферами");
  }

  return session;
}

async function collectOfferData(formData: FormData) {
  const slug = readString(formData, "slug");
  const officialSite = readOptionalString(formData, "officialSite");

  validateSlug(slug);
  validateHttpsUrl(officialSite, "Официальный сайт");
  const logoUrl = await saveLogoUpload(formData, slug);

  return {
    slug,
    status: readEnum(formData, "status", OFFER_STATUSES, "PAUSED"),
    brandName: readString(formData, "brandName"),
    legalName: readOptionalString(formData, "legalName"),
    logoText: readOptionalString(formData, "logoText"),
    logoUrl,
    officialSite,
    shortDescription: readOptionalString(formData, "shortDescription"),
    badge: readOptionalString(formData, "badge"),
    rating: readDecimal(formData, "rating"),
    reviewsCount: readInt(formData, "reviewsCount") ?? 0,
    minAmount: readInt(formData, "minAmount"),
    maxAmount: readInt(formData, "maxAmount"),
    minTermDays: readInt(formData, "minTermDays"),
    maxTermDays: readInt(formData, "maxTermDays"),
    dailyRateFrom: readDecimal(formData, "dailyRateFrom"),
    dailyRateTo: readDecimal(formData, "dailyRateTo"),
    pskFrom: readDecimal(formData, "pskFrom"),
    pskTo: readDecimal(formData, "pskTo"),
    approvalLabel: readOptionalString(formData, "approvalLabel"),
    approvalTone: readEnum(formData, "approvalTone", APPROVAL_TONES, "MEDIUM"),
    decisionTime: readOptionalString(formData, "decisionTime"),
    payoutMethods: readList(formData, "payoutMethods"),
    repaymentMethods: readList(formData, "repaymentMethods"),
    requirements: readList(formData, "requirements"),
    documents: readList(formData, "documents"),
    advantages: readList(formData, "advantages"),
    warnings: readList(formData, "warnings"),
    legalDisclosure: readOptionalString(formData, "legalDisclosure"),
    displayPriority: readInt(formData, "displayPriority") ?? 100,
    conditionsCheckedAt: readDate(formData, "conditionsCheckedAt"),
    updatedByUserAt: new Date(),
  };
}

function collectAffiliateData(formData: FormData) {
  const trackingBaseUrl = readOptionalString(formData, "trackingBaseUrl");

  validateHttpsUrl(trackingBaseUrl, "Партнерская ссылка");

  if (!trackingBaseUrl) {
    return null;
  }

  return {
    network: "OTHER" as const,
    networkName: readOptionalString(formData, "networkName"),
    networkOfferId: readOptionalString(formData, "networkOfferId"),
    targetAction: readOptionalString(formData, "targetAction"),
    payoutAmount: readDecimal(formData, "payoutAmount"),
    currency: readOptionalString(formData, "currency") ?? "RUB",
    holdDays: readInt(formData, "holdDays"),
    reconciliationPeriod: readOptionalString(formData, "reconciliationPeriod"),
    geoIncluded: readList(formData, "geoIncluded"),
    geoExcluded: readList(formData, "geoExcluded"),
    dailyCap: readInt(formData, "dailyCap"),
    monthlyCap: readInt(formData, "monthlyCap"),
    allowedTrafficTypes: readList(formData, "allowedTrafficTypes"),
    forbiddenTrafficTypes: readList(formData, "forbiddenTrafficTypes"),
    trackingBaseUrl,
    isActive: readString(formData, "affiliateIsActive") !== "off",
  };
}

function shouldRetryWithoutNetworkName(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes("Unknown argument `networkName`")
  );
}

function removeNetworkName<T extends { networkName?: string | null }>(data: T) {
  const safeData = { ...data };
  delete safeData.networkName;

  return safeData;
}

async function updateAffiliateOffer(
  affiliateOfferId: string,
  affiliateData: NonNullable<ReturnType<typeof collectAffiliateData>>,
) {
  try {
    await prisma.affiliateOffer.update({
      where: {
        id: affiliateOfferId,
      },
      data: affiliateData,
    });
  } catch (error) {
    if (!shouldRetryWithoutNetworkName(error)) {
      throw error;
    }

    await prisma.affiliateOffer.update({
      where: {
        id: affiliateOfferId,
      },
      data: removeNetworkName(affiliateData),
    });
  }
}

async function createAffiliateOffer(
  offerId: string,
  affiliateData: NonNullable<ReturnType<typeof collectAffiliateData>>,
) {
  try {
    await prisma.affiliateOffer.create({
      data: {
        ...affiliateData,
        offerId,
      },
    });
  } catch (error) {
    if (!shouldRetryWithoutNetworkName(error)) {
      throw error;
    }

    await prisma.affiliateOffer.create({
      data: {
        ...removeNetworkName(affiliateData),
        offerId,
      },
    });
  }
}

export async function createOffer(formData: FormData) {
  await requireOfferManager();

  const offerData = await collectOfferData(formData);
  const affiliateData = collectAffiliateData(formData);

  if (!offerData.brandName) {
    throw new Error("Название МФО обязательно");
  }

  const offer = await prisma.offer.create({
    data: {
      ...offerData,
    },
  });

  if (affiliateData) {
    await createAffiliateOffer(offer.id, affiliateData);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect(`/admin?section=offers&created=${offerData.slug}`);
}

export async function updateOffer(formData: FormData) {
  await requireOfferManager();

  const offerId = readString(formData, "offerId");
  const affiliateOfferId = readOptionalString(formData, "affiliateOfferId");
  const offerData = await collectOfferData(formData);
  const affiliateData = collectAffiliateData(formData);

  if (!offerId) {
    throw new Error("Не найден ID оффера");
  }

  await prisma.offer.update({
    where: {
      id: offerId,
    },
    data: offerData,
  });

  if (affiliateData && affiliateOfferId) {
    await updateAffiliateOffer(affiliateOfferId, affiliateData);
  } else if (affiliateData) {
    await createAffiliateOffer(offerId, affiliateData);
  } else if (affiliateOfferId) {
    await prisma.affiliateOffer.update({
      where: {
        id: affiliateOfferId,
      },
      data: {
        isActive: false,
      },
    });
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/admin/offers/${offerId}`);
  revalidatePath(`/offers/${offerData.slug}`);
  redirect(`/admin/offers/${offerId}?saved=1`);
}
