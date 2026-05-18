import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/admin-auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Вход в админку — ZaimKarta",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLoginPage() {
  if (await hasAdminSession()) {
    redirect("/admin");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8fb] px-5 py-10 text-slate-950">
      <section className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <Link href="/" className="text-xl font-bold">
          ZaimKarta
        </Link>
        <h1 className="mt-8 text-3xl font-bold">Вход в админку</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Введите логин и пароль для доступа к статистике и управлению офферами.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
