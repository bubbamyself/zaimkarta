"use client";

import type { ReactNode } from "react";
import { useState } from "react";

type SeoPageEditorFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  isEdit: boolean;
};

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function hasReadableText(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .trim().length > 0;
}

function hasForbiddenPromise(text: string) {
  const normalized = text.toLocaleLowerCase("ru-RU");

  return [
    /100\s*%\s*одобр/,
    /гарантированн/,
    /деньги\s+всем/,
    /одобр[а-яё]*\s+всем/,
    /без\s+отказа\s+(?:кажд|всем|гарант|получ|одобр|выдад|дадут)/,
  ].some((pattern) => pattern.test(normalized));
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
  const [validationMessage, setValidationMessage] = useState("");

  function validatePublication(event: React.FormEvent<HTMLFormElement>) {
    const nativeEvent = event.nativeEvent as SubmitEvent;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const submitStatus = getSubmitStatus(formData, nativeEvent.submitter);
    const slug = textValue(formData, "slug");

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

    if (pageType === "CATEGORY" && formData.getAll("offerId").length === 0) {
      missingFields.push({ name: "offerId", label: "Офферы в подборке" });
    }

    if (pageType === "SERVICE" && !textValue(formData, "pageToolToolId")) {
      missingFields.push({ name: "pageToolToolId", label: "Основной инструмент" });
    }

    const publicText = [
      textValue(formData, "title"),
      textValue(formData, "description"),
      textValue(formData, "h1"),
      textValue(formData, "intro"),
      textValue(formData, "content"),
      textValue(formData, "riskNotice"),
      textValue(formData, "contentBlocks"),
    ].join("\n");

    if (hasForbiddenPromise(publicText)) {
      event.preventDefault();
      setValidationMessage(
        "В тексте есть рискованное обещание: 100% одобрение, гарантированно, деньги всем или без отказа как обещание.",
      );
      return;
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
      action={action}
      onSubmit={validatePublication}
      noValidate
      className="grid gap-6 rounded-lg border border-slate-200 bg-slate-50 p-4"
    >
      {validationMessage ? (
        <div className="sticky top-3 z-30 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 shadow-sm">
          {validationMessage}
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
              className="rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
            >
              Сохранить черновик
            </button>
            <button
              type="submit"
              className="rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
            >
              {isEdit ? "Сохранить изменения" : "Создать страницу"}
            </button>
            <button
              type="submit"
              name="submitStatus"
              value="PUBLISHED"
              className="rounded-md bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              Опубликовать
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
