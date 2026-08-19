"use client";

import type { ReactNode } from "react";
import { useActionState, useEffect, useRef, useState } from "react";
import type { SeoPageActionState } from "./seo-actions";

type SeoPageEditorFormProps = {
  action: (
    state: SeoPageActionState,
    formData: FormData,
  ) => Promise<SeoPageActionState>;
  children: ReactNode;
  isEdit: boolean;
};

type FormControlSnapshot = {
  checked?: boolean;
  value: string;
};

function captureFormControls(form: HTMLFormElement) {
  const snapshot = new Map<string, FormControlSnapshot[]>();

  Array.from(form.elements).forEach((element) => {
    if (
      !(
        element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement ||
        element instanceof HTMLSelectElement
      ) ||
      !element.name ||
      (element instanceof HTMLInputElement && element.type === "file")
    ) {
      return;
    }

    const values = snapshot.get(element.name) ?? [];
    values.push({
      value: element.value,
      ...(element instanceof HTMLInputElement &&
      (element.type === "checkbox" || element.type === "radio")
        ? { checked: element.checked }
        : {}),
    });
    snapshot.set(element.name, values);
  });

  return snapshot;
}

function restoreFormControls(
  form: HTMLFormElement,
  snapshot: Map<string, FormControlSnapshot[]>,
) {
  const indexes = new Map<string, number>();

  Array.from(form.elements).forEach((element) => {
    if (
      !(
        element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement ||
        element instanceof HTMLSelectElement
      ) ||
      !element.name ||
      (element instanceof HTMLInputElement && element.type === "file")
    ) {
      return;
    }

    const index = indexes.get(element.name) ?? 0;
    indexes.set(element.name, index + 1);
    const savedControl = snapshot.get(element.name)?.[index];

    if (!savedControl) {
      return;
    }

    if (
      element instanceof HTMLInputElement &&
      (element.type === "checkbox" || element.type === "radio")
    ) {
      element.checked = Boolean(savedControl.checked);
      return;
    }

    element.value = savedControl.value;
  });
}

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function hasReadableText(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .trim().length > 0;
}

function hasRiskyPromise(text: string) {
  const normalized = text.toLocaleLowerCase("ru-RU");

  return [
    /100\s*%\s*одобр/,
    /гарантированн/,
    /деньги\s+всем/,
    /одобр[а-яё]*\s+всем/,
    /без\s+отказа\s+(?:кажд|всем|гарант|получ|одобр|выдад|дадут)/,
  ].some((pattern) => pattern.test(normalized));
}

function getPublicFormText(formData: FormData) {
  return [
    textValue(formData, "title"),
    textValue(formData, "description"),
    textValue(formData, "h1"),
    textValue(formData, "intro"),
    textValue(formData, "content"),
    textValue(formData, "riskNotice"),
    textValue(formData, "contentBlocks"),
  ].join("\n");
}

function getSubmitStatus(formData: FormData, submitter: SubmitEvent["submitter"]) {
  if (
    submitter instanceof HTMLButtonElement &&
    submitter.name === "submitStatus"
  ) {
    return submitter.value;
  }

  return textValue(formData, "status");
}

function markMissingFields(form: HTMLFormElement, names: string[]) {
  form
    .querySelectorAll("[data-publication-field]")
    .forEach((element) => element.removeAttribute("data-missing"));

  names.forEach((name) => {
    form
      .querySelectorAll(`[data-publication-field="${name}"]`)
      .forEach((element) => element.setAttribute("data-missing", "true"));
  });
}

function focusFirstMissingField(form: HTMLFormElement, names: string[]) {
  const firstName = names[0];

  if (!firstName) {
    return;
  }

  const field = form.querySelector<HTMLElement>(`[name="${firstName}"]`);
  const container = form.querySelector<HTMLElement>(
    `[data-publication-field="${firstName}"]`,
  );

  (field ?? container)?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
  field?.focus?.();
}

export function SeoPageEditorForm({
  action,
  children,
  isEdit,
}: SeoPageEditorFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const submittedControlsRef =
    useRef<Map<string, FormControlSnapshot[]> | null>(null);
  const [validationMessage, setValidationMessage] = useState("");
  const [legalWarning, setLegalWarning] = useState("");
  const [state, formAction, isPending] = useActionState(action, {});

  function refreshLegalWarning(formData: FormData) {
    setLegalWarning(
      hasRiskyPromise(getPublicFormText(formData))
        ? "Предупреждение: в тексте найдена формулировка, похожая на обещание одобрения или результата. Проверка может ошибаться — сохранение и публикация не заблокированы."
        : "",
    );
  }

  useEffect(() => {
    const form = formRef.current;
    const submittedControls = submittedControlsRef.current;

    if (!state.error || !form || !submittedControls) {
      return;
    }

    restoreFormControls(form, submittedControls);
  }, [state]);

  function validatePublication(event: React.FormEvent<HTMLFormElement>) {
    const nativeEvent = event.nativeEvent as SubmitEvent;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const submitStatus = getSubmitStatus(formData, nativeEvent.submitter);
    const slug = textValue(formData, "slug");
    submittedControlsRef.current = captureFormControls(form);
    refreshLegalWarning(formData);

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      event.preventDefault();
      markMissingFields(form, ["slug"]);
      setValidationMessage(
        "Заполни slug латиницей, цифрами и дефисами, например kak-vybrat-zaim.",
      );
      focusFirstMissingField(form, ["slug"]);
      return;
    }

    if (submitStatus !== "PUBLISHED") {
      markMissingFields(form, []);
      setValidationMessage("");
      return;
    }

    const pageType = textValue(formData, "pageType");
    const missingFields: { name: string; label: string }[] = [];

    [
      ["slug", "Slug"],
      ["title", "Title"],
      ["description", "Description"],
      ["h1", "H1"],
      ["intro", "Intro"],
      ["riskNotice", "Предупреждение о рисках"],
    ].forEach(([name, label]) => {
      if (!textValue(formData, name)) {
        missingFields.push({ name, label });
      }
    });

    if (
      pageType === "ARTICLE" &&
      !hasReadableText(textValue(formData, "content")) &&
      !textValue(formData, "contentBlocks")
    ) {
      missingFields.push({ name: "content", label: "Основной текст статьи" });
    }

    if (pageType === "CATEGORY") {
      const selectedOfferIds = formData.getAll("offerId");

      if (selectedOfferIds.length === 0) {
        missingFields.push({ name: "offerId", label: "Офферы в подборке" });
      } else {
        const unavailableOffers = Array.from(
          form.querySelectorAll<HTMLInputElement>(
            'input[name="offerId"]:checked[data-publication-unavailable]',
          ),
        );

        if (unavailableOffers.length > 0) {
          event.preventDefault();
          markMissingFields(form, ["offerId"]);
          setValidationMessage(
            unavailableOffers
              .map((input) => input.dataset.publicationUnavailable)
              .filter(Boolean)
              .join(" "),
          );
          focusFirstMissingField(form, ["offerId"]);
          return;
        }
      }
    }

    if (pageType === "SERVICE" && !textValue(formData, "pageToolToolId")) {
      missingFields.push({ name: "pageToolToolId", label: "Основной инструмент" });
    }

    if (missingFields.length === 0) {
      markMissingFields(form, []);
      setValidationMessage("");
      return;
    }

    event.preventDefault();
    markMissingFields(
      form,
      missingFields.map((field) => field.name),
    );
    setValidationMessage(
      `Для публикации заполни: ${missingFields
        .map((field) => field.label)
        .join(", ")}.`,
    );
    focusFirstMissingField(
      form,
      missingFields.map((field) => field.name),
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={validatePublication}
      onInput={(event) => refreshLegalWarning(new FormData(event.currentTarget))}
      noValidate
      className="grid gap-6 rounded-lg border border-slate-200 bg-slate-50 p-4"
    >
      {legalWarning || validationMessage || state.error ? (
        <div className="sticky top-3 z-30 grid gap-2">
          {legalWarning ? (
            <div
              aria-live="polite"
              className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900 shadow-sm"
            >
              {legalWarning}
            </div>
          ) : null}
          {validationMessage || state.error ? (
            <div
              aria-live="polite"
              className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 shadow-sm"
            >
              {validationMessage || state.error}
            </div>
          ) : null}
        </div>
      ) : null}

      {children}

      <div className="sticky bottom-4 z-20 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Черновик можно сохранить неполным. Перед публикацией редактор
            подсветит незаполненные обязательные поля.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              name="submitStatus"
              value="DRAFT"
              disabled={isPending}
              className="rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
            >
              {isPending ? "Сохраняем…" : "Сохранить черновик"}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
            >
              {isPending
                ? "Сохраняем…"
                : isEdit
                  ? "Сохранить изменения"
                  : "Создать страницу"}
            </button>
            <button
              type="submit"
              name="submitStatus"
              value="PUBLISHED"
              disabled={isPending}
              className="rounded-md bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              {isPending ? "Публикуем…" : "Опубликовать"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
