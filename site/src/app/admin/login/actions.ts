"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminSession, verifyAdminCredentials } from "@/lib/admin-auth";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

export type LoginState = {
  error?: string;
};

const LOGIN_RATE_LIMIT = 8;
const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

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
  const normalizedUsername = username.toLowerCase();
  const ipRateLimitKey = `admin-login:ip:${clientIp}`;
  const usernameRateLimitKey = `admin-login:username:${normalizedUsername}`;
  const ipLimit = checkRateLimit({
    key: ipRateLimitKey,
    limit: LOGIN_RATE_LIMIT,
    windowMs: LOGIN_RATE_LIMIT_WINDOW_MS,
  });
  const usernameLimit = checkRateLimit({
    key: usernameRateLimitKey,
    limit: LOGIN_RATE_LIMIT,
    windowMs: LOGIN_RATE_LIMIT_WINDOW_MS,
  });

  if (!ipLimit.allowed || !usernameLimit.allowed) {
    const retryAfterSeconds = Math.max(
      ipLimit.retryAfterSeconds,
      usernameLimit.retryAfterSeconds,
    );

    console.warn("Admin login rate limit exceeded", {
      ip: clientIp,
      username: normalizedUsername,
      retryAfterSeconds,
    });

    return {
      error: `Слишком много попыток входа. Попробуйте через ${Math.ceil(retryAfterSeconds / 60)} мин.`,
    };
  }

  const admin = await verifyAdminCredentials(username, password);

  if (!admin) {
    return {
      error: "Неверный логин или пароль",
    };
  }

  resetRateLimit(ipRateLimitKey);
  resetRateLimit(usernameRateLimitKey);
  await createAdminSession(admin);
  redirect("/admin");
}
