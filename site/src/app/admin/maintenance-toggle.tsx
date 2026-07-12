"use client";

import { useFormStatus } from "react-dom";
import { setMaintenanceMode } from "./maintenance-actions";

function SubmitButton({ enabled }: { enabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex min-h-10 items-center justify-center rounded-md border px-4 text-sm font-bold transition disabled:cursor-wait disabled:opacity-60 ${
        enabled
          ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
          : "border-slate-300 bg-white text-slate-800 hover:border-slate-500"
      }`}
    >
      {pending ? "Сохраняю…" : `ТЕХРАБОТЫ: ${enabled ? "ВКЛ" : "ВЫКЛ"}`}
    </button>
  );
}

export function MaintenanceToggle({ enabled }: { enabled: boolean }) {
  return (
    <form
      action={setMaintenanceMode}
      onSubmit={(event) => {
        if (
          !window.confirm(
            enabled
              ? "Выключить режим техработ и снова открыть публичный сайт?"
              : "Включить режим техработ и закрыть публичный сайт для посетителей?",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="enabled" value={String(!enabled)} />
      <SubmitButton enabled={enabled} />
    </form>
  );
}
