import type { Metadata } from "next";
import { connection } from "next/server";
import { isMaintenanceModeEnabled } from "@/lib/maintenance-mode";

export async function generateMetadata(): Promise<Metadata> {
  await connection();

  if (!(await isMaintenanceModeEnabled())) {
    return {};
  }

  return {
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await connection();

  if (!(await isMaintenanceModeEnabled())) {
    return children;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8fb] px-5 text-slate-950">
      <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm sm:px-12">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">
          ZaimKarta
        </p>
        <h1 className="mt-5 text-3xl font-bold sm:text-4xl">
          Технические работы
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
          В настоящий момент на сервисе ZAIMKARTA проводятся технические работы.
          Спасибо за понимание, возвращайтесь позже.
        </p>
      </section>
    </main>
  );
}
