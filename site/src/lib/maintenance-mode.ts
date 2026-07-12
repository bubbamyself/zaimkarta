import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const MAINTENANCE_MODE_KEY = "maintenance_mode";

export const isMaintenanceModeEnabled = cache(async () => {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: MAINTENANCE_MODE_KEY },
    select: { value: true },
  });

  return setting?.value === "on";
});
