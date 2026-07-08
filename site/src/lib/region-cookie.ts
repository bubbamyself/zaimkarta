import "server-only";
import { cookies } from "next/headers";
import { getRussianRegionByCode } from "@/lib/russian-regions";

export const REGION_COOKIE_NAME = "zk_region_code";
export const REGION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export async function getSelectedRegionCode() {
  const cookieStore = await cookies();
  const regionCode = cookieStore.get(REGION_COOKIE_NAME)?.value;

  return getRussianRegionByCode(regionCode)?.code ?? null;
}
