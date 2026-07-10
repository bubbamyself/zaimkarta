"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminSession, verifyAdminCredentials } from "@/lib/admin-auth";
import { checkRateLimit } from "@/lib/rate-limit";

export type LoginState = {
  error?: string;
};

export async function loginAdmin(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  const realIp = headerStore.get("x-real-ip");
  const clientIp =
    forwardedFor?.split(",").at(0)?.trim() || realIp?.trim() || "unknown";
  const loginLimit = checkRateLimit({
    key: `admin-login:${clientIp}:${username.toLowerCase()}`,
    limit: 8,
    windowMs: 15 * 60 * 1000,
  });

  if (!loginLimit.allowed) {
    return {
      error: "Слишком много попыток входа. Попробуйте позже.",
    };
  }

  const admin = await verifyAdminCredentials(username, password);

  if (!admin) {
    return {
      error: "Неверный логин или пароль",
    };
  }

  await createAdminSession(admin);
  redirect("/admin");
}
