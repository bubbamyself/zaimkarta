"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { OfferActionState } from "./offer-actions";

type OfferFormAction = (
  state: OfferActionState,
  formData: FormData,
) => Promise<OfferActionState>;

export function OfferFormShell({
  action,
  children,
  submitLabel,
}: {
  action: OfferFormAction;
  children: ReactNode;
  submitLabel: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(action, {});
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const form = formRef.current;

    if (!form) {
      return;
    }

    form
      .querySelectorAll("[data-offer-field-error='true']")
      .forEach((element) => {
        element.removeAttribute("data-offer-field-error");
        element.removeAttribute("aria-invalid");
        element.classList.remove("ring-2", "ring-red-500", "border-red-400");
      });

    if (!state.error) {
      const timeoutId = window.setTimeout(() => {
        setIsDialogOpen(false);
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    const timeoutId = window.setTimeout(() => {
      setIsDialogOpen(true);
    }, 0);

    for (const fieldName of state.missingFieldNames ?? []) {
      const fields = form.querySelectorAll<HTMLElement>(
        `[name="${CSS.escape(fieldName)}"]`,
      );

      fields.forEach((field) => {
        field.setAttribute("data-offer-field-error", "true");
        field.setAttribute("aria-invalid", "true");
        field.classList.add("ring-2", "ring-red-500", "border-red-400");
      });
    }

    const firstMissingField = state.missingFieldNames?.[0];

    if (firstMissingField) {
      const field = form.querySelector<HTMLElement>(
        `[name="${CSS.escape(firstMissingField)}"]`,
      );
      field?.focus();
      field?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }

    return () => window.clearTimeout(timeoutId);
  }, [state]);

  return (
    <>
      <form
        ref={formRef}
        action={formAction}
        className="grid gap-6 rounded-lg border border-slate-200 bg-slate-50 p-4"
      >
        {state.error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
            {state.error}
          </div>
        ) : null}

        {children}

        <button
          disabled={isPending}
          className="w-fit rounded-md bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-wait disabled:bg-slate-400"
        >
          {isPending ? "Сохраняем..." : submitLabel}
        </button>
      </form>

      {isDialogOpen && state.error ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4 py-6">
          <section className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
            <h2 className="text-lg font-bold text-slate-950">
              Оффер не сохранен
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {state.error}
            </p>
            <button
              type="button"
              onClick={() => setIsDialogOpen(false)}
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white"
            >
              Окей
            </button>
          </section>
        </div>
      ) : null}
    </>
  );
}
