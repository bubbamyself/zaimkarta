"use client";

import { useActionState } from "react";
import { loginAdmin } from "./actions";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAdmin, {});

  return (
    <form action={formAction} className="mt-8 grid gap-4">
      <label className="grid gap-2">
        <span className="text-sm font-medium text-slate-700">Логин</span>
        <input
          name="username"
          type="text"
          autoComplete="username"
          className="h-12 rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-emerald-700"
          required
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-slate-700">Пароль</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          className="h-12 rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-emerald-700"
          required
        />
      </label>

      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex min-h-12 items-center justify-center rounded-md bg-emerald-700 px-5 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:bg-slate-400"
      >
        {isPending ? "Входим..." : "Войти"}
      </button>
    </form>
  );
}
