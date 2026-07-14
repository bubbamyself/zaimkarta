"use server";

import type { ApprovalTone, OfferStatus } from "@prisma/client";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import path from "path";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { normalizeRegionCodes } from "@/lib/russian-regions";

const LOGO_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "logos");
const LOGO_PUBLIC_PATH = "/uploads/logos";
const MAX_LOGO_BYTES = 400 * 1024;
const MAX_LOGO_DIMENSION = 4096;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const SAFE_LOGO_PATH_PATTERN =
  /^\/uploads\/logos\/[a-z0-9]+(?:-[a-z0-9]+)*-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:png|svg)$/;
const OFFER_STATUSES: OfferStatus[] = ["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"];
const APPROVAL_TONES: ApprovalTone[] = ["LOW", "MEDIUM", "HIGH"];

export type OfferActionState = {
  error?: string;
  missingFieldNames?: string[];
};

class OfferFormError extends Error {
  missingFieldNames: string[];

  constructor(message: string, missingFieldNames: string[] = []) {
    super(message);
    this.name = "OfferFormError";
    this.missingFieldNames = missingFieldNames;
  }
}

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function actionError(message: string, missingFieldNames: string[] = []) {
  return new OfferFormError(message, missingFieldNames);
}

function isRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string" &&
    error.digest.startsWith("NEXT_REDIRECT")
  );
}

function toOfferActionState(error: unknown): OfferActionState {
  if (error instanceof OfferFormError) {
    return {
      error: error.message,
      missingFieldNames: error.missingFieldNames,
    };
  }

  if (error instanceof Error) {
    return {
      error: error.message,
    };
  }

  return {
    error: "Не удалось сохранить оффер. Проверь поля и попробуй еще раз.",
  };
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

function readReferenceDecimal(formData: FormData, key: string) {
  const value = readString(formData, key).replace(",", ".");

  if (!value || !/^\d+(\.\d+)?$/.test(value)) {
    return null;
  }

  return value;
}

function readList(formData: FormData, key: string) {
  const values = formData
    .getAll(key)
    .map((item) => String(item).trim())
    .filter(Boolean);

  if (values.length > 1) {
    return values;
  }

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

function validatePngLogo(buffer: Buffer) {
  if (
    buffer.length < 24 ||
    !buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE) ||
    buffer.toString("ascii", 12, 16) !== "IHDR"
  ) {
    throw actionError("Файл логотипа должен быть корректным PNG");
  }

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);

  if (
    width === 0 ||
    height === 0 ||
    width > MAX_LOGO_DIMENSION ||
    height > MAX_LOGO_DIMENSION
  ) {
    throw actionError("Размер логотипа не должен превышать 4096×4096 px");
  }
}

function readSafeCurrentLogoPath(formData: FormData) {
  const currentLogoUrl = readOptionalString(formData, "currentLogoUrl");

  if (!currentLogoUrl) {
    return null;
  }

  if (!SAFE_LOGO_PATH_PATTERN.test(currentLogoUrl)) {
    throw actionError(
      "Текущий логотип имеет недопустимый путь. Загрузите логотип заново",
    );
  }

  return currentLogoUrl;
}

async function saveLogoUpload(formData: FormData, slug: string) {
  const file = formData.get("logoFile");

  if (!(file instanceof File) || file.size === 0) {
    return readSafeCurrentLogoPath(formData);
  }

  if (file.type !== "image/png") {
    throw actionError("Логотип должен быть PNG-файлом");
  }

  if (file.size > MAX_LOGO_BYTES) {
    throw actionError("Файл логотипа слишком большой. Максимум — 400 КБ");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  validatePngLogo(buffer);

  await mkdir(LOGO_UPLOAD_DIR, {
    recursive: true,
  });

  const safeSlug = slug.replace(/[^a-z0-9-]/g, "");
  const fileName = `${safeSlug}-${randomUUID()}.png`;
  const filePath = path.resolve(LOGO_UPLOAD_DIR, fileName);

  if (!filePath.startsWith(`${path.resolve(LOGO_UPLOAD_DIR)}${path.sep}`)) {
    throw actionError("Не удалось безопасно определить путь для логотипа");
  }

  await writeFile(filePath, buffer, { flag: "wx" });

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
    restrictedRegionCodes: normalizeRegionCodes(
      readList(formData, "restrictedRegionCodes"),
    ),
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
    payoutAmount: readReferenceDecimal(formData, "payoutAmount"),
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

function hasValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return value !== null && value !== undefined;
}

function validateOfferPublication(
  offerData: Awaited<ReturnType<typeof collectOfferData>>,
  affiliateData: ReturnType<typeof collectAffiliateData>,
) {
  if (offerData.status !== "ACTIVE") {
    return;
  }

  const missingFields: { label: string; name: string }[] = [];

  const requiredOfferFields: [string, string, unknown][] = [
    ["Название кредитора", "brandName", offerData.brandName],
    ["Slug", "slug", offerData.slug],
    ["Юр. название", "legalName", offerData.legalName],
    ["Лого-текст", "logoText", offerData.logoText],
    ["Логотип кредитора", "logoFile", offerData.logoUrl],
    ["Официальный сайт", "officialSite", offerData.officialSite],
    ["Короткое описание", "shortDescription", offerData.shortDescription],
    ["Бейдж", "badge", offerData.badge],
    ["Приоритет показа", "displayPriority", offerData.displayPriority],
    ["Дата проверки условий", "conditionsCheckedAt", offerData.conditionsCheckedAt],
    ["Мин. сумма", "minAmount", offerData.minAmount],
    ["Макс. сумма", "maxAmount", offerData.maxAmount],
    ["Мин. срок, дней", "minTermDays", offerData.minTermDays],
    ["Макс. срок, дней", "maxTermDays", offerData.maxTermDays],
    ["Ставка от", "dailyRateFrom", offerData.dailyRateFrom],
    ["Ставка до", "dailyRateTo", offerData.dailyRateTo],
    ["ПСК от", "pskFrom", offerData.pskFrom],
    ["ПСК до", "pskTo", offerData.pskTo],
    ["Рейтинг", "rating", offerData.rating],
    ["Отзывы", "reviewsCount", offerData.reviewsCount],
    ["Одобрение", "approvalLabel", offerData.approvalLabel],
    ["Тон одобрения", "approvalTone", offerData.approvalTone],
    ["Время решения", "decisionTime", offerData.decisionTime],
    ["Способы получения", "payoutMethods", offerData.payoutMethods],
    ["Способы погашения", "repaymentMethods", offerData.repaymentMethods],
    ["Требования", "requirements", offerData.requirements],
    ["Документы", "documents", offerData.documents],
    ["Плюсы/теги", "advantages", offerData.advantages],
    ["Предупреждения", "warnings", offerData.warnings],
    ["Юридическая/рекламная сноска", "legalDisclosure", offerData.legalDisclosure],
  ];

  for (const [label, name, value] of requiredOfferFields) {
    if (!hasValue(value)) {
      missingFields.push({ label, name });
    }
  }

  if (!affiliateData) {
    missingFields.push({
      label: "Партнерская ссылка",
      name: "trackingBaseUrl",
    });
  } else {
    const requiredAffiliateFields: [string, string, unknown][] = [
      ["CPA-сеть", "networkName", affiliateData.networkName],
      ["Offer ID в сети", "networkOfferId", affiliateData.networkOfferId],
      ["Партнерская ссылка", "trackingBaseUrl", affiliateData.trackingBaseUrl],
    ];

    for (const [label, name, value] of requiredAffiliateFields) {
      if (!hasValue(value)) {
        missingFields.push({ label, name });
      }
    }

    if (!affiliateData.isActive) {
      missingFields.push({
        label: "Ссылка активна",
        name: "affiliateIsActive",
      });
    }
  }

  if (missingFields.length > 0) {
    const missingLabels = missingFields.map((field) => field.label);
    const missingFieldNames = Array.from(
      new Set(missingFields.map((field) => field.name)),
    );

    throw actionError(
      `Нельзя активировать оффер. Заполни поля: ${missingLabels.join(", ")}.`,
      missingFieldNames,
    );
  }
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

export async function createOffer(
  _state: OfferActionState,
  formData: FormData,
): Promise<OfferActionState> {
  try {
    await requireOfferManager();

    const offerData = await collectOfferData(formData);
    const affiliateData = collectAffiliateData(formData);
    validateOfferPublication(offerData, affiliateData);

    if (!offerData.brandName) {
      throw actionError("Название кредитора обязательно", ["brandName"]);
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
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    return toOfferActionState(error);
  }
}

export async function updateOffer(
  _state: OfferActionState,
  formData: FormData,
): Promise<OfferActionState> {
  try {
    await requireOfferManager();

    const offerId = readString(formData, "offerId");
    const affiliateOfferId = readOptionalString(formData, "affiliateOfferId");
    const offerData = await collectOfferData(formData);
    const affiliateData = collectAffiliateData(formData);
    validateOfferPublication(offerData, affiliateData);

    if (!offerId) {
      throw actionError("Не найден ID оффера");
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
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    return toOfferActionState(error);
  }
}

export async function updateOfferDisplayOrder(offerIds: string[]) {
  await requireOfferManager();

  const uniqueOfferIds = Array.from(new Set(offerIds)).filter(Boolean);

  if (uniqueOfferIds.length === 0) {
    return;
  }

  await prisma.$transaction(
    uniqueOfferIds.map((offerId, index) =>
      prisma.offer.update({
        where: {
          id: offerId,
        },
        data: {
          displayPriority: index + 1,
          updatedByUserAt: new Date(),
        },
      }),
    ),
  );

  revalidatePath("/");
  revalidatePath("/admin");
}
