import { createHash, timingSafeEqual } from "crypto";
import {
  AffiliateNetwork,
  ConversionEventType,
  ConversionStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getProductionSecret } from "@/lib/production-secret";

const SUPPORTED_PARAMETER_NAMES = new Set([
  "secret",
  "conversion_id",
  "transaction_id",
  "click_id",
  "offer_slug",
  "offer_id",
  "status",
  "payout",
  "currency",
]);

type LeadGidPostbackInput = {
  externalConversionId: string;
  networkTransactionId: string;
  clickId: string;
  offerSlug: string;
  networkOfferId: string;
  rawStatus: string;
  normalizedStatus: ConversionStatus;
  payoutAmount: string;
  currency: string;
};

type ProcessResult =
  | { outcome: "created" | "updated" | "duplicate" }
  | { outcome: "ignored"; reason: "unknown_click" | "click_mismatch" };

export class LeadGidPostbackValidationError extends Error {}

function readRequiredParameter(
  searchParams: URLSearchParams,
  name: string,
  maxLength: number,
) {
  const values = searchParams.getAll(name);

  if (values.length !== 1) {
    throw new LeadGidPostbackValidationError(`Invalid ${name}`);
  }

  const value = values[0].trim();

  if (!value || value.length > maxLength) {
    throw new LeadGidPostbackValidationError(`Invalid ${name}`);
  }

  return value;
}

function normalizeStatusKey(value: string) {
  return value.trim().toLocaleLowerCase("ru-RU").replaceAll("ё", "е");
}

export function normalizeLeadGidStatus(value: string): ConversionStatus {
  const normalized = normalizeStatusKey(value);

  if (normalized === "на проверке") {
    return ConversionStatus.PENDING;
  }

  if (normalized === "подлежит оплате") {
    return ConversionStatus.APPROVED;
  }

  if (normalized === "отклонен") {
    return ConversionStatus.REJECTED;
  }

  return ConversionStatus.UNKNOWN;
}

export function isValidLeadGidSecret(receivedSecret: string) {
  const expectedSecret = getProductionSecret({
    name: "LEADGID_POSTBACK_SECRET",
    value: process.env.LEADGID_POSTBACK_SECRET,
    localFallback: "leadgid-local-postback-secret",
  });
  const received = Buffer.from(receivedSecret);
  const expected = Buffer.from(expectedSecret);

  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function parseLeadGidPostback(
  searchParams: URLSearchParams,
): LeadGidPostbackInput {
  for (const name of searchParams.keys()) {
    if (!SUPPORTED_PARAMETER_NAMES.has(name)) {
      throw new LeadGidPostbackValidationError("Unsupported parameter");
    }
  }

  const externalConversionId = readRequiredParameter(
    searchParams,
    "conversion_id",
    64,
  );
  const networkTransactionId = readRequiredParameter(
    searchParams,
    "transaction_id",
    64,
  );
  const clickId = readRequiredParameter(searchParams, "click_id", 64);
  const offerSlug = readRequiredParameter(searchParams, "offer_slug", 120);
  const networkOfferId = readRequiredParameter(searchParams, "offer_id", 64);
  const rawStatus = readRequiredParameter(searchParams, "status", 100);
  const payout = readRequiredParameter(searchParams, "payout", 32).replace(",", ".");
  const currency = readRequiredParameter(searchParams, "currency", 8).toUpperCase();

  if (!/^\d+$/.test(externalConversionId)) {
    throw new LeadGidPostbackValidationError("Invalid conversion_id");
  }

  if (!/^[a-f0-9]{30}$/i.test(networkTransactionId)) {
    throw new LeadGidPostbackValidationError("Invalid transaction_id");
  }

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      clickId,
    )
  ) {
    throw new LeadGidPostbackValidationError("Invalid click_id");
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(offerSlug)) {
    throw new LeadGidPostbackValidationError("Invalid offer_slug");
  }

  if (!/^\d+$/.test(networkOfferId)) {
    throw new LeadGidPostbackValidationError("Invalid offer_id");
  }

  if (!/^\d+(?:\.\d{1,2})?$/.test(payout)) {
    throw new LeadGidPostbackValidationError("Invalid payout");
  }

  const payoutNumber = Number(payout);

  if (!Number.isFinite(payoutNumber) || payoutNumber > 9_999_999_999.99) {
    throw new LeadGidPostbackValidationError("Invalid payout");
  }

  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new LeadGidPostbackValidationError("Invalid currency");
  }

  return {
    externalConversionId,
    networkTransactionId,
    clickId,
    offerSlug,
    networkOfferId,
    rawStatus,
    normalizedStatus: normalizeLeadGidStatus(rawStatus),
    payoutAmount: payoutNumber.toFixed(2),
    currency,
  };
}

function stateSignature({
  rawStatus,
  normalizedStatus,
  payoutAmount,
  currency,
}: {
  rawStatus: string;
  normalizedStatus: ConversionStatus;
  payoutAmount: string;
  currency: string;
}) {
  return createHash("sha256")
    .update(JSON.stringify({ rawStatus, normalizedStatus, payoutAmount, currency }))
    .digest("hex");
}

function createEventKey(
  externalConversionId: string,
  previousState: string,
  nextState: string,
) {
  return createHash("sha256")
    .update(AffiliateNetwork.LEADGID)
    .update(externalConversionId)
    .update(previousState)
    .update(nextState)
    .digest("hex");
}

function getEventType({
  statusChanged,
  payoutChanged,
}: {
  statusChanged: boolean;
  payoutChanged: boolean;
}): ConversionEventType {
  if (statusChanged && payoutChanged) {
    return ConversionEventType.STATUS_AND_PAYOUT_UPDATE;
  }

  if (payoutChanged) {
    return ConversionEventType.PAYOUT_UPDATE;
  }

  return ConversionEventType.STATUS_UPDATE;
}

async function processInTransaction(
  input: LeadGidPostbackInput,
): Promise<ProcessResult> {
  return prisma.$transaction(async (transaction) => {
    const click = await transaction.offerClick.findUnique({
      where: { id: input.clickId },
      include: {
        offer: {
          select: {
            id: true,
            slug: true,
          },
        },
        affiliateOffer: {
          select: {
            network: true,
          },
        },
      },
    });

    if (!click) {
      return { outcome: "ignored", reason: "unknown_click" };
    }

    if (
      click.offer.slug !== input.offerSlug ||
      click.affiliateOffer?.network !== AffiliateNetwork.LEADGID
    ) {
      return { outcome: "ignored", reason: "click_mismatch" };
    }

    const existing = await transaction.affiliateConversion.findUnique({
      where: {
        network_externalConversionId: {
          network: AffiliateNetwork.LEADGID,
          externalConversionId: input.externalConversionId,
        },
      },
    });
    const nextSignature = stateSignature(input);

    if (!existing) {
      const eventKey = createEventKey(
        input.externalConversionId,
        "initial",
        nextSignature,
      );

      await transaction.affiliateConversion.create({
        data: {
          network: AffiliateNetwork.LEADGID,
          externalConversionId: input.externalConversionId,
          networkTransactionId: input.networkTransactionId,
          offerClickId: click.id,
          offerId: click.offer.id,
          networkOfferId: input.networkOfferId,
          rawStatus: input.rawStatus,
          normalizedStatus: input.normalizedStatus,
          payoutAmount: input.payoutAmount,
          currency: input.currency,
          events: {
            create: {
              eventKey,
              eventType: ConversionEventType.NEW,
              rawStatus: input.rawStatus,
              normalizedStatus: input.normalizedStatus,
              payoutAmount: input.payoutAmount,
              currency: input.currency,
            },
          },
        },
      });

      return { outcome: "created" };
    }

    if (existing.offerClickId !== click.id || existing.offerId !== click.offer.id) {
      return { outcome: "ignored", reason: "click_mismatch" };
    }

    const previousState = {
      rawStatus: existing.rawStatus,
      normalizedStatus: existing.normalizedStatus,
      payoutAmount: existing.payoutAmount.toFixed(2),
      currency: existing.currency,
    };
    const previousSignature = stateSignature(previousState);

    if (previousSignature === nextSignature) {
      return { outcome: "duplicate" };
    }

    const statusChanged =
      existing.rawStatus !== input.rawStatus ||
      existing.normalizedStatus !== input.normalizedStatus;
    const payoutChanged =
      existing.payoutAmount.toFixed(2) !== input.payoutAmount ||
      existing.currency !== input.currency;
    const eventKey = createEventKey(
      input.externalConversionId,
      previousSignature,
      nextSignature,
    );

    await transaction.affiliateConversion.update({
      where: { id: existing.id },
      data: {
        networkTransactionId: input.networkTransactionId,
        networkOfferId: input.networkOfferId,
        rawStatus: input.rawStatus,
        normalizedStatus: input.normalizedStatus,
        payoutAmount: input.payoutAmount,
        currency: input.currency,
        events: {
          create: {
            eventKey,
            eventType: getEventType({ statusChanged, payoutChanged }),
            rawStatus: input.rawStatus,
            normalizedStatus: input.normalizedStatus,
            payoutAmount: input.payoutAmount,
            currency: input.currency,
          },
        },
      },
    });

    return { outcome: "updated" };
  });
}

export async function processLeadGidPostback(
  input: LeadGidPostbackInput,
): Promise<ProcessResult> {
  try {
    return await processInTransaction(input);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return processInTransaction(input);
    }

    throw error;
  }
}
