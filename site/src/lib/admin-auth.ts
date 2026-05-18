import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const ADMIN_COOKIE_NAME = "zk_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

function getAdminUsername() {
  return process.env.ADMIN_USERNAME;
}

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD;
}

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET;
}

function signSession(username: string, expiresAt: number) {
  const sessionSecret = getSessionSecret();

  if (!sessionSecret) {
    return null;
  }

  return createHmac("sha256", sessionSecret)
    .update(`${username}.${expiresAt}`)
    .digest("hex");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyAdminCredentials(username: string, password: string) {
  const adminUsername = getAdminUsername();
  const adminPassword = getAdminPassword();

  if (!adminUsername || !adminPassword || !getSessionSecret()) {
    return false;
  }

  return (
    safeEqual(username, adminUsername) &&
    safeEqual(password, adminPassword)
  );
}

export async function createAdminSession() {
  const username = getAdminUsername();
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const signature = username ? signSession(username, expiresAt) : null;

  if (!username || !signature) {
    return;
  }

  const cookieStore = await cookies();

  cookieStore.set(ADMIN_COOKIE_NAME, `${username}.${expiresAt}.${signature}`, {
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

export async function hasAdminSession() {
  const cookieStore = await cookies();
  const value = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  if (!value) {
    return false;
  }

  const [username, expiresAtValue, signature] = value.split(".");
  const expiresAt = Number(expiresAtValue);

  if (!username || !signature || !Number.isFinite(expiresAt)) {
    return false;
  }

  if (expiresAt < Date.now()) {
    return false;
  }

  const expectedSignature = signSession(username, expiresAt);

  if (!expectedSignature) {
    return false;
  }

  return safeEqual(signature, expectedSignature);
}
