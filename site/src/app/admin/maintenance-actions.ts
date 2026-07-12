"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { MAINTENANCE_MODE_KEY } from "@/lib/maintenance-mode";
import { prisma } from "@/lib/prisma";

export async function setMaintenanceMode(formData: FormData) {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  if (session.role !== "BOSS") {
    throw new Error("Недостаточно прав для изменения режима техработ.");
  }

  const enabled = formData.get("enabled") === "true";

  await prisma.systemSetting.upsert({
    where: { key: MAINTENANCE_MODE_KEY },
    create: {
      key: MAINTENANCE_MODE_KEY,
      value: enabled ? "on" : "off",
    },
    update: {
      value: enabled ? "on" : "off",
    },
  });

  console.info("Maintenance mode changed", {
    adminId: session.id,
    adminUsername: session.username,
    enabled,
  });

  revalidatePath("/", "layout");
  revalidatePath("/admin");
}
