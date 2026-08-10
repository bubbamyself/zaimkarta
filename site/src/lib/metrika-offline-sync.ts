import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildOfflineConversionsCsv,
  getOfflineConversionUploadStatus,
  MetrikaApiError,
  type MetrikaFetchImplementation,
  uploadOfflineConversionBatch,
} from "@/lib/metrika-offline-api";
const SYNC_LOCK_KEY = "metrika_offline_sync_lock";
const LAST_SUCCESS_KEY = "metrika_offline_last_success";
const BATCH_SIZE = 100;
const ATTRIBUTION_WINDOW_MS = 21 * 24 * 60 * 60 * 1000;
const POLL_DELAY_MS = 10 * 60 * 1000;
const LOCK_STALE_AFTER_MINUTES = 30;
const MAX_RETRY_ATTEMPTS = 8;

function retryAt(attempts: number, now: Date) {
  const delayMinutes = Math.min(6 * 60, 2 ** Math.min(attempts, 8) * 5);
  return new Date(now.getTime() + delayMinutes * 60 * 1000);
}

async function acquireSyncLock(owner: string) {
  const rows = await prisma.$queryRaw<Array<{ value: string }>>(Prisma.sql`
    INSERT INTO "SystemSetting" ("key", "value", "updatedAt")
    VALUES (${SYNC_LOCK_KEY}, ${owner}, NOW())
    ON CONFLICT ("key") DO UPDATE
    SET "value" = EXCLUDED."value", "updatedAt" = NOW()
    WHERE "SystemSetting"."updatedAt" < NOW() - (${LOCK_STALE_AFTER_MINUTES} * INTERVAL '1 minute')
    RETURNING "value"
  `);

  return rows.at(0)?.value === owner;
}

async function releaseSyncLock(owner: string) {
  await prisma.$executeRaw(Prisma.sql`
    DELETE FROM "SystemSetting"
    WHERE "key" = ${SYNC_LOCK_KEY} AND "value" = ${owner}
  `);
}

async function markApiFailure(
  where: { id?: { in: string[] }; uploadId?: string },
  error: unknown,
  now: Date,
) {
  const apiError =
    error instanceof MetrikaApiError
      ? error
      : new MetrikaApiError(null, true);
  const rows = await prisma.metrikaOfflineConversion.findMany({
    where,
    select: { id: true, attempts: true },
  });

  for (const row of rows) {
    const attempts = row.attempts + 1;
    const failed = !apiError.retryable || attempts >= MAX_RETRY_ATTEMPTS;

    await prisma.metrikaOfflineConversion.update({
      where: { id: row.id },
      data: {
        attempts,
        status: failed ? "FAILED" : undefined,
        completedAt: failed ? now : null,
        nextAttemptAt: failed ? null : retryAt(attempts, now),
        lastError: apiError.message,
      },
    });
  }
}

async function pollExistingUploads({
  counterId,
  oauthToken,
  now,
  fetchImplementation,
}: {
  counterId: string;
  oauthToken: string;
  now: Date;
  fetchImplementation: MetrikaFetchImplementation;
}) {
  const uploadGroups = await prisma.metrikaOfflineConversion.findMany({
    where: {
      status: "UPLOADED",
      uploadId: { not: null },
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
    },
    distinct: ["uploadId"],
    select: { uploadId: true },
  });

  for (const group of uploadGroups) {
    if (!group.uploadId) {
      continue;
    }

    try {
      const status = await getOfflineConversionUploadStatus({
        counterId,
        oauthToken,
        uploadId: group.uploadId,
        fetchImplementation,
      });

      if (status === "PROCESSED") {
        await prisma.metrikaOfflineConversion.updateMany({
          where: { uploadId: group.uploadId, status: "UPLOADED" },
          data: {
            status: "PROCESSED",
            completedAt: now,
            nextAttemptAt: null,
            lastError: null,
          },
        });
      } else if (status === "LINKAGE_FAILURE") {
        await prisma.metrikaOfflineConversion.updateMany({
          where: { uploadId: group.uploadId, status: "UPLOADED" },
          data: {
            status: "FAILED",
            completedAt: now,
            nextAttemptAt: null,
            lastError: "yandex_linkage_failure",
          },
        });
      } else {
        await prisma.metrikaOfflineConversion.updateMany({
          where: { uploadId: group.uploadId, status: "UPLOADED" },
          data: { nextAttemptAt: new Date(now.getTime() + POLL_DELAY_MS) },
        });
      }
    } catch (error) {
      await markApiFailure({ uploadId: group.uploadId }, error, now);
    }
  }
}

export async function syncMetrikaOfflineConversions({
  now = new Date(),
  fetchImplementation = fetch,
}: {
  now?: Date;
  fetchImplementation?: MetrikaFetchImplementation;
} = {}) {
  if (process.env.YANDEX_METRIKA_OFFLINE_EXPORT_ENABLED !== "true") {
    return { outcome: "disabled" as const, uploaded: 0 };
  }

  const counterId = process.env.YANDEX_METRIKA_COUNTER_ID?.trim() ?? "";
  const oauthToken = process.env.YANDEX_METRIKA_OAUTH_TOKEN?.trim() ?? "";

  if (!/^\d+$/.test(counterId) || !oauthToken) {
    throw new Error("Metrika offline export configuration is incomplete");
  }

  const owner = randomUUID();

  if (!(await acquireSyncLock(owner))) {
    return { outcome: "locked" as const, uploaded: 0 };
  }

  try {
    const cutoff = new Date(now.getTime() - ATTRIBUTION_WINDOW_MS);
    await prisma.metrikaOfflineConversion.updateMany({
      where: { status: "PENDING", eventAt: { lt: cutoff } },
      data: {
        status: "SKIPPED",
        completedAt: now,
        nextAttemptAt: null,
        lastError: "outside_21_day_attribution_window",
      },
    });

    await pollExistingUploads({
      counterId,
      oauthToken,
      now,
      fetchImplementation,
    });

    const batch = await prisma.metrikaOfflineConversion.findMany({
      where: {
        status: "PENDING",
        clientId: { not: null },
        eventAt: { gte: cutoff, lte: now },
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
      },
      orderBy: [{ eventAt: "asc" }, { createdAt: "asc" }],
      take: BATCH_SIZE,
    });

    if (batch.length > 0) {
      try {
        const uploadId = await uploadOfflineConversionBatch({
          counterId,
          oauthToken,
          csv: buildOfflineConversionsCsv(batch),
          fetchImplementation,
        });
        await prisma.metrikaOfflineConversion.updateMany({
          where: { id: { in: batch.map((row) => row.id) }, status: "PENDING" },
          data: {
            status: "UPLOADED",
            uploadId,
            sentAt: now,
            attempts: { increment: 1 },
            nextAttemptAt: new Date(now.getTime() + POLL_DELAY_MS),
            lastError: null,
          },
        });
      } catch (error) {
        await markApiFailure(
          { id: { in: batch.map((row) => row.id) } },
          error,
          now,
        );
      }
    }

    await prisma.systemSetting.upsert({
      where: { key: LAST_SUCCESS_KEY },
      update: { value: now.toISOString() },
      create: { key: LAST_SUCCESS_KEY, value: now.toISOString() },
    });

    return { outcome: "completed" as const, uploaded: batch.length };
  } finally {
    await releaseSyncLock(owner);
  }
}

export const METRIKA_LAST_SUCCESS_SETTING_KEY = LAST_SUCCESS_KEY;
