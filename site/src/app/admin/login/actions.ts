"use server";

import { redirect } from "next/navigation";
import { createAdminSession, verifyAdminCredentials } from "@/lib/admin-auth";

export type LoginState = {
  error?: string;
};

export async function loginAdmin(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const admin = await verifyAdminCredentials(username, password);

  if (!admin) {
    return {
      error: "Неверный логин или пароль",
    };
  }

  await createAdminSession(admin);
  redirect("/admin");
}
