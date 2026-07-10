import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import type { AdminRole } from "@prisma/client";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { getProductionSecret } from "@/lib/production-secret";

const ADMIN_COOKIE_NAME = "zk_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

export type AdminSession = {
  id: string;
  username: string;
  role: AdminRole;
  permissions: string[];
};

type SessionPayload = {
  adminId: string;
  expiresAt: number;
};

function getSessionSecret() {
  return getProductionSecret({
    name: "ADMIN_SESSION_SECRET",
    value: process.env.ADMIN_SESSION_SECRET,
  });
}

function encodePayload(payload: SessionPayload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodePayload(value: string): SessionPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));

    if (
      typeof parsed.adminId !== "string" ||
      typeof parsed.expiresAt !== "number"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function signPayload(encodedPayload: string) {
  const sessionSecret = getSessionSecret();

  if (!sessionSecret) {
    return null;
  }

  return createHmac("sha256", sessionSecret)
    .update(encodedPayload)
    .digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export async function verifyAdminCredentials(
  username: string,
  password: string,
): Promise<AdminSession | null> {
  if (!getSessionSecret()) {
    return null;
  }

  const admin = await prisma.adminUser.findUnique({
    where: {
      username,
    },
  });

  if (!admin?.isActive || !verifyPassword(password, admin.passwordHash)) {
    return null;
  }

  return {
    id: admin.id,
    username: admin.username,
    role: admin.role,
    permissions: admin.permissions,
  };
}

export async function createAdminSession(admin: AdminSession) {
  const payload = encodePayload({
    adminId: admin.id,
    expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  });
  const signature = signPayload(payload);

  if (!signature) {
    return;
  }

  const cookieStore = await cookies();

  cookieStore.set(ADMIN_COOKIE_NAME, `${payload}.${signature}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/admin",
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  if (!value) {
    return null;
  }

  const [encodedPayload, signature] = value.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload);

  if (!expectedSignature || !safeEqual(signature, expectedSignature)) {
    return null;
  }

  const payload = decodePayload(encodedPayload);

  if (!payload || payload.expiresAt < Date.now()) {
    return null;
  }

  const admin = await prisma.adminUser.findUnique({
    where: {
      id: payload.adminId,
    },
  });

  if (!admin?.isActive) {
    return null;
  }

  return {
    id: admin.id,
    username: admin.username,
    role: admin.role,
    permissions: admin.permissions,
  };
}

export async function hasAdminSession() {
  return Boolean(await getAdminSession());
}
