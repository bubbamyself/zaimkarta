import "server-only";
import { cookies } from "next/headers";
import { REGION_COOKIE_NAME } from "@/lib/region-cookie-config";
import { getRussianRegionByCode } from "@/lib/russian-regions";

export async function getSelectedRegionCode() {
  const cookieStore = await cookies();
  const regionCode = cookieStore.get(REGION_COOKIE_NAME)?.value;

  return getRussianRegionByCode(regionCode)?.code ?? null;
}
