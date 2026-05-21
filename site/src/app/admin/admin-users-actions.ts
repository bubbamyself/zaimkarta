"use server";

import type { AdminRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createPasswordHash } from "@/lib/password";
import { prisma } from "@/lib/prisma";

const ALLOWED_PERMISSIONS = ["analytics", "offers_read", "clicks_read"];

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readRole(formData: FormData): AdminRole {
  return readString(formData, "role") === "BOSS" ? "BOSS" : "ADMIN";
}

function readPermissions(formData: FormData) {
  const permissions = formData
    .getAll("permissions")
    .map((item) => String(item))
    .filter((item) => ALLOWED_PERMISSIONS.includes(item));

  return [...new Set(permissions)];
}

async function requireBoss() {
  const session = await getAdminSession();

  if (session?.role !== "BOSS") {
    throw new Error("Недостаточно прав");
  }

  return session;
}

function validateUsername(username: string) {
  if (!/^[A-Za-z0-9_.-]{3,40}$/.test(username)) {
    throw new Error("Логин должен быть от 3 до 40 символов: латиница, цифры, _ . -");
  }
}

function validatePassword(password: string) {
  if (password.length < 6) {
    throw new Error("Пароль должен быть не короче 6 символов");
  }
}

async function preventLastBossRemoval(adminId: string, nextRole?: AdminRole) {
  const admin = await prisma.adminUser.findUnique({
    where: {
      id: adminId,
    },
  });

  if (!admin || admin.role !== "BOSS") {
    return;
  }

  const bossCount = await prisma.adminUser.count({
    where: {
      role: "BOSS",
      isActive: true,
    },
  });

  if (bossCount <= 1 && nextRole !== "BOSS") {
    throw new Error("Нельзя удалить или понизить последнего boss");
  }
}

export async function createAdminUser(formData: FormData) {
  await requireBoss();

  const username = readString(formData, "username");
  const password = readString(formData, "password");
  const role = readRole(formData);
  const permissions = readPermissions(formData);

  validateUsername(username);
  validatePassword(password);

  await prisma.adminUser.create({
    data: {
      username,
      passwordHash: createPasswordHash(password),
      role,
      permissions,
      isActive: true,
    },
  });

  revalidatePath("/admin");
}

export async function updateAdminUser(formData: FormData) {
  const session = await requireBoss();
  const adminId = readString(formData, "adminId");
  const role = readRole(formData);
  const permissions = readPermissions(formData);
  const isActive = readString(formData, "isActive") === "on";

  if (adminId === session.id && (!isActive || role !== "BOSS")) {
    throw new Error("Нельзя отключить или понизить самого себя");
  }

  await preventLastBossRemoval(adminId, isActive ? role : undefined);

  await prisma.adminUser.update({
    where: {
      id: adminId,
    },
    data: {
      role,
      permissions,
      isActive,
    },
  });

  revalidatePath("/admin");
}

export async function updateAdminPassword(formData: FormData) {
  await requireBoss();

  const adminId = readString(formData, "adminId");
  const password = readString(formData, "password");

  validatePassword(password);

  await prisma.adminUser.update({
    where: {
      id: adminId,
    },
    data: {
      passwordHash: createPasswordHash(password),
    },
  });

  revalidatePath("/admin");
}

export async function deleteAdminUser(formData: FormData) {
  const session = await requireBoss();
  const adminId = readString(formData, "adminId");

  if (adminId === session.id) {
    throw new Error("Нельзя удалить самого себя");
  }

  await preventLastBossRemoval(adminId);

  await prisma.adminUser.delete({
    where: {
      id: adminId,
    },
  });

  revalidatePath("/admin");
}
