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

function readOptionalNumber(formData: FormData, key: string) {
  const rawValue = readString(formData, key);

  if (!rawValue) {
    return null;
  }

  const value = Number(rawValue);

  return Number.isFinite(value) ? value : null;
}

function readOptionalBoolean(formData: FormData, key: string, fallback: boolean) {
  const value = readString(formData, key);

  if (!value) {
    return fallback;
  }

  return value === "true";
}

function readNumberList(formData: FormData, key: string, fallback: number[]) {
  const value = readString(formData, key);

  if (!value) {
    return fallback;
  }

  const numbers = value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0);

  return numbers.length > 0 ? numbers : fallback;
}

function readLinks(formData: FormData, key: string) {
  const value = readString(formData, key);

  if (!value) {
    return [];
  }

  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, href] = line.split("|").map((item) => item.trim());

      return label && href ? { label, href } : null;
    })
    .filter((item): item is { label: string; href: string } => Boolean(item));
}

function mergeJsonRecord(base: Record<string, unknown>, override: Record<string, unknown>) {
  return {
    ...base,
    ...override,
  };
}

function mergeNestedRecord(
  base: Record<string, unknown>,
  key: string,
  override: Record<string, unknown>,
) {
  return {
    ...((base[key] ?? {}) as Record<string, unknown>),
    ...override,
  };
}

function collectNumberFields(
  formData: FormData,
  fieldMap: Record<string, string>,
) {
  return Object.fromEntries(
    Object.entries(fieldMap)
      .map(([formKey, configKey]) => {
        const value = readOptionalNumber(formData, formKey);

        return value === null ? null : [configKey, value];
      })
      .filter((entry): entry is [string, number] => Array.isArray(entry)),
  );
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

  if (!session) {
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
  const advancedConfig = rawConfig
    ? parseJsonObject(rawConfig, "Config")
    : {};
  const defaultConfig = defaultConfigForToolType(type);
  const defaultAmount = readOptionalNumber(formData, "defaultAmount");
  const defaultTermDays = readOptionalNumber(formData, "defaultTermDays");
  const defaultDailyRate = readOptionalNumber(formData, "defaultDailyRate");
  const ctaText = readOptionalString(formData, "ctaText");
  const riskNoticeText = readOptionalString(formData, "riskNoticeText");
  const defaultConfigRecord = defaultConfig as Record<string, unknown>;
  const managedConfig: Record<string, unknown> = {
    ...defaultConfig,
    ...(type === "OVERPAYMENT_CALCULATOR"
      ? {
          defaults: {
            ...((defaultConfigRecord.defaults ?? {}) as Record<string, unknown>),
            ...(defaultAmount !== null ? { amount: defaultAmount } : {}),
            ...(defaultTermDays !== null ? { termDays: defaultTermDays } : {}),
            ...(defaultDailyRate !== null ? { dailyRate: defaultDailyRate } : {}),
          },
          limits: mergeNestedRecord(defaultConfigRecord, "limits", {
            ...collectNumberFields(formData, {
              amountMin: "amountMin",
              amountMax: "amountMax",
              termMinDays: "termMinDays",
              termMaxDays: "termMaxDays",
              dailyRateMin: "dailyRateMin",
              dailyRateMax: "dailyRateMax",
            }),
          }),
          steps: mergeNestedRecord(defaultConfigRecord, "steps", {
            ...collectNumberFields(formData, {
              amountStep: "amount",
              termDaysStep: "termDays",
              dailyRateStep: "dailyRate",
            }),
          }),
          result: mergeNestedRecord(defaultConfigRecord, "result", {
            ...(readOptionalString(formData, "resultTitle")
              ? { title: readOptionalString(formData, "resultTitle") }
              : {}),
            ...(readOptionalString(formData, "formulaNote")
              ? { formulaNote: readOptionalString(formData, "formulaNote") }
              : {}),
            showTotalReturn: readOptionalBoolean(
              formData,
              "showTotalReturn",
              true,
            ),
            showOverpayment: readOptionalBoolean(formData, "showOverpayment", true),
            showDailyCost: readOptionalBoolean(formData, "showDailyCost", true),
          }),
        }
      : {}),
    ...(type === "APPLICATION_CHECKLIST"
      ? {
          results: [
            {
              minPercent: 80,
              title:
                readOptionalString(formData, "checklistResultTitle0") ??
                "Подберем предложения по вашим ответам",
              text:
                readOptionalString(formData, "checklistResultText0") ??
                "Карточки ниже перестроятся с учетом способа получения и выбранного приоритета.",
            },
            {
              minPercent: 40,
              title:
                readOptionalString(formData, "checklistResultTitle1") ??
                "Есть что уточнить",
              text:
                readOptionalString(formData, "checklistResultText1") ??
                "Ответьте на оставшиеся вопросы, чтобы подборка стала точнее.",
            },
            {
              minPercent: 0,
              title:
                readOptionalString(formData, "checklistResultTitle2") ??
                "Начните с базовых условий",
              text:
                readOptionalString(formData, "checklistResultText2") ??
                "Проверим возраст, документ, способ получения и главный приоритет.",
            },
          ],
        }
      : {}),
    ...(type === "REPAYMENT_DATE_CALCULATOR"
      ? {
          defaults: mergeNestedRecord(defaultConfigRecord, "defaults", {
            ...collectNumberFields(formData, {
              defaultTermDays: "termDays",
            }),
          }),
          limits: mergeNestedRecord(defaultConfigRecord, "limits", {
            ...collectNumberFields(formData, {
              termMinDays: "termMinDays",
              termMaxDays: "termMaxDays",
            }),
          }),
          quickTerms: readNumberList(
            formData,
            "quickTerms",
            ((defaultConfigRecord.quickTerms ?? [7, 14, 21, 30]) as number[]),
          ),
          labels: mergeNestedRecord(defaultConfigRecord, "labels", {
            ...(readOptionalString(formData, "startDateLabel")
              ? { startDate: readOptionalString(formData, "startDateLabel") }
              : {}),
            ...(readOptionalString(formData, "termDaysLabel")
              ? { termDays: readOptionalString(formData, "termDaysLabel") }
              : {}),
            ...(readOptionalString(formData, "termUnitLabel")
              ? { termUnit: readOptionalString(formData, "termUnitLabel") }
              : {}),
          }),
          result: mergeNestedRecord(defaultConfigRecord, "result", {
            ...(readOptionalString(formData, "repaymentDateTitleTemplate")
              ? {
                  titleTemplate: readOptionalString(
                    formData,
                    "repaymentDateTitleTemplate",
                  ),
                }
              : {}),
            ...(readOptionalString(formData, "repaymentDatePastText")
              ? { pastText: readOptionalString(formData, "repaymentDatePastText") }
              : {}),
            ...(readOptionalString(formData, "repaymentDateTodayText")
              ? { todayText: readOptionalString(formData, "repaymentDateTodayText") }
              : {}),
            ...(readOptionalString(formData, "repaymentDateFutureTextTemplate")
              ? {
                  futureTextTemplate: readOptionalString(
                    formData,
                    "repaymentDateFutureTextTemplate",
                  ),
                }
              : {}),
            ...(readOptionalString(formData, "repaymentDateWeekendWarning")
              ? {
                  weekendWarning: readOptionalString(
                    formData,
                    "repaymentDateWeekendWarning",
                  ),
                }
              : {}),
          }),
        }
      : {}),
    ...(type === "COMPARISON"
      ? {
          defaults: mergeNestedRecord(defaultConfigRecord, "defaults", {
            ...collectNumberFields(formData, {
              defaultAmount: "amount",
              defaultTermDays: "termDays",
            }),
            ...(readOptionalString(formData, "comparisonPriority")
              ? { priority: readOptionalString(formData, "comparisonPriority") }
              : {}),
          }),
          limits: mergeNestedRecord(defaultConfigRecord, "limits", {
            ...collectNumberFields(formData, {
              amountMin: "amountMin",
              amountMax: "amountMax",
              termMinDays: "termMinDays",
              termMaxDays: "termMaxDays",
            }),
          }),
          steps: mergeNestedRecord(defaultConfigRecord, "steps", {
            ...collectNumberFields(formData, {
              amountStep: "amount",
              termDaysStep: "termDays",
            }),
          }),
          quickAmounts: readNumberList(
            formData,
            "quickAmounts",
            ((defaultConfigRecord.quickAmounts ?? [
              5000,
              10000,
              15000,
              30000,
            ]) as number[]),
          ),
          quickTerms: readNumberList(
            formData,
            "quickTerms",
            ((defaultConfigRecord.quickTerms ?? [7, 14, 21, 30]) as number[]),
          ),
          labels: mergeNestedRecord(defaultConfigRecord, "labels", {
            ...(readOptionalString(formData, "firstOfferLabel")
              ? { firstOffer: readOptionalString(formData, "firstOfferLabel") }
              : {}),
            ...(readOptionalString(formData, "secondOfferLabel")
              ? { secondOffer: readOptionalString(formData, "secondOfferLabel") }
              : {}),
            ...(readOptionalString(formData, "amountLabel")
              ? { amount: readOptionalString(formData, "amountLabel") }
              : {}),
            ...(readOptionalString(formData, "termDaysLabel")
              ? { termDays: readOptionalString(formData, "termDaysLabel") }
              : {}),
            ...(readOptionalString(formData, "priorityLabel")
              ? { priority: readOptionalString(formData, "priorityLabel") }
              : {}),
          }),
          result: mergeNestedRecord(defaultConfigRecord, "result", {
            ...(readOptionalString(formData, "comparisonResultTitle")
              ? { title: readOptionalString(formData, "comparisonResultTitle") }
              : {}),
            ...(readOptionalString(formData, "sameCostText")
              ? { sameCostText: readOptionalString(formData, "sameCostText") }
              : {}),
            ...(readOptionalString(formData, "notAvailableText")
              ? {
                  notAvailableText: readOptionalString(
                    formData,
                    "notAvailableText",
                  ),
                }
              : {}),
          }),
        }
      : {}),
    ...(type === "OVERDUE_LOAN_CALCULATOR"
      ? {
          defaults: mergeNestedRecord(defaultConfigRecord, "defaults", {
            ...collectNumberFields(formData, {
              defaultPrincipalDebt: "principalDebt",
              defaultAccruedInterestAtDueDate: "accruedInterestAtDueDate",
              defaultDailyRate: "dailyRate",
              defaultAnnualPenaltyRate: "annualPenaltyRate",
              defaultDailyPenaltyRate: "dailyPenaltyRate",
            }),
            ...(readOptionalString(formData, "overdueInterestMode")
              ? { interestMode: readOptionalString(formData, "overdueInterestMode") }
              : {}),
          }),
          limits: mergeNestedRecord(defaultConfigRecord, "limits", {
            ...collectNumberFields(formData, {
              principalDebtMin: "principalDebtMin",
              principalDebtMax: "principalDebtMax",
              accruedInterestMin: "accruedInterestMin",
              accruedInterestMax: "accruedInterestMax",
              dailyRateMin: "dailyRateMin",
              dailyRateMax: "dailyRateMax",
              annualPenaltyRateMin: "annualPenaltyRateMin",
              annualPenaltyRateMax: "annualPenaltyRateMax",
              dailyPenaltyRateMin: "dailyPenaltyRateMin",
              dailyPenaltyRateMax: "dailyPenaltyRateMax",
            }),
          }),
          labels: mergeNestedRecord(defaultConfigRecord, "labels", {
            ...(readOptionalString(formData, "dueDateLabel")
              ? { dueDate: readOptionalString(formData, "dueDateLabel") }
              : {}),
            ...(readOptionalString(formData, "calculationDateLabel")
              ? {
                  calculationDate: readOptionalString(
                    formData,
                    "calculationDateLabel",
                  ),
                }
              : {}),
            ...(readOptionalString(formData, "principalDebtLabel")
              ? { principalDebt: readOptionalString(formData, "principalDebtLabel") }
              : {}),
            ...(readOptionalString(formData, "accruedInterestLabel")
              ? {
                  accruedInterestAtDueDate: readOptionalString(
                    formData,
                    "accruedInterestLabel",
                  ),
                }
              : {}),
            ...(readOptionalString(formData, "overdueInterestModeLabel")
              ? {
                  interestMode: readOptionalString(
                    formData,
                    "overdueInterestModeLabel",
                  ),
                }
              : {}),
            ...(readOptionalString(formData, "dailyRateLabel")
              ? { dailyRate: readOptionalString(formData, "dailyRateLabel") }
              : {}),
            ...(readOptionalString(formData, "annualPenaltyRateLabel")
              ? {
                  annualPenaltyRate: readOptionalString(
                    formData,
                    "annualPenaltyRateLabel",
                  ),
                }
              : {}),
            ...(readOptionalString(formData, "dailyPenaltyRateLabel")
              ? {
                  dailyPenaltyRate: readOptionalString(
                    formData,
                    "dailyPenaltyRateLabel",
                  ),
                }
              : {}),
          }),
          hints: mergeNestedRecord(defaultConfigRecord, "hints", {
            ...(readOptionalString(formData, "partialPaymentsHint")
              ? {
                  partialPayments: readOptionalString(
                    formData,
                    "partialPaymentsHint",
                  ),
                }
              : {}),
            ...(readOptionalString(formData, "dailyRateHint")
              ? { dailyRate: readOptionalString(formData, "dailyRateHint") }
              : {}),
            ...(readOptionalString(formData, "penaltyHint")
              ? { penalty: readOptionalString(formData, "penaltyHint") }
              : {}),
            ...(readOptionalString(formData, "limitHint")
              ? { limit: readOptionalString(formData, "limitHint") }
              : {}),
            ...(readOptionalString(formData, "unknownInterestModeHint")
              ? {
                  unknownInterestMode: readOptionalString(
                    formData,
                    "unknownInterestModeHint",
                  ),
                }
              : {}),
          }),
          result: mergeNestedRecord(defaultConfigRecord, "result", {
            ...(readOptionalString(formData, "overdueResultTitle")
              ? { title: readOptionalString(formData, "overdueResultTitle") }
              : {}),
            ...(readOptionalString(formData, "overdueFormulaTitle")
              ? {
                  formulaTitle: readOptionalString(
                    formData,
                    "overdueFormulaTitle",
                  ),
                }
              : {}),
          }),
          links: readLinks(formData, "overdueLinks"),
        }
      : {}),
    ...(ctaText
      ? {
          cta: {
            ...((defaultConfigRecord.cta ?? {}) as Record<string, unknown>),
            text: ctaText,
          },
        }
      : {}),
    ...(riskNoticeText
      ? {
          riskNotice: {
            text: riskNoticeText,
          },
        }
      : {}),
  };
  const config = mergeJsonRecord(managedConfig, advancedConfig);
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
