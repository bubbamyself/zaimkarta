"use client";

import { useActionState } from "react";
import { duplicateOffer } from "./offer-actions";

export function CopyOfferButton({
  offerId,
  compact = false,
}: {
  offerId: string;
  compact?: boolean;
}) {
  const [state, action, isPending] = useActionState(duplicateOffer, {});

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Создать отдельный черновик-копию? Статистика и размещения копироваться не будут.",
          )
        ) {
          event.preventDefault();
        }
      }}
      className={compact ? "grid gap-1" : "grid gap-2"}
    >
      <input type="hidden" name="offerId" value={offerId} />
      <button
        type="submit"
        disabled={isPending}
        className={
          compact
            ? "font-semibold text-violet-700 hover:text-violet-800 disabled:text-slate-400"
            : "inline-flex min-h-10 items-center justify-center rounded-md border border-violet-300 bg-white px-4 text-sm font-semibold text-violet-800 transition hover:bg-violet-50 disabled:text-slate-400"
        }
      >
        {isPending ? "Создаю копию…" : "Создать копию"}
      </button>
      {state.error ? (
        <span className="text-xs leading-5 text-red-700">{state.error}</span>
      ) : null}
    </form>
  );
}
