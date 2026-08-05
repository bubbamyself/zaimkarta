"use client";

import { useRef, useState } from "react";
import { publishCalculatorAnalytics } from "@/lib/calculator-analytics";

type CalculatorShareActionsProps = {
  createUrl: () => string;
  title: string;
  text: string;
  toolType: "overpayment" | "repayment_date";
  pageSlug: string;
  source: "direct" | "shared";
};

function copyWithSelection(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } finally {
    textarea.remove();
  }
}

export function CalculatorShareActions({
  createUrl,
  title,
  text,
  toolType,
  pageSlug,
  source,
}: CalculatorShareActionsProps) {
  const [status, setStatus] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const manualInputRef = useRef<HTMLInputElement>(null);

  function createTrackedUrl() {
    const url = createUrl();
    publishCalculatorAnalytics("share_link_created", {
      tool_type: toolType,
      page_slug: pageSlug,
      source,
    });
    return url;
  }

  async function handleShare() {
    const shouldUseNativeShare =
      window.matchMedia("(max-width: 767px)").matches &&
      typeof navigator.share === "function";

    if (!shouldUseNativeShare) {
      await handleCopy();
      return;
    }

    const url = createTrackedUrl();
    setStatus("");
    publishCalculatorAnalytics("share_native_opened", {
      tool_type: toolType,
      page_slug: pageSlug,
      share_method: "native",
      source,
    });

    try {
      await navigator.share({ title, text, url });
      setStatus("Системное меню отправки завершило работу");
      publishCalculatorAnalytics("share_native_completed", {
        tool_type: toolType,
        page_slug: pageSlug,
        share_method: "native",
        source,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setManualUrl(url);
      setStatus("Выберите и скопируйте ссылку из поля ниже");
      requestAnimationFrame(() => manualInputRef.current?.select());
    }
  }

  async function handleCopy() {
    const url = createTrackedUrl();
    setStatus("");
    let copied = false;

    if (navigator.clipboard?.writeText) {
      try {
        copied = await Promise.race([
          navigator.clipboard.writeText(url).then(() => true),
          new Promise<boolean>((resolve) =>
            window.setTimeout(() => resolve(false), 500),
          ),
        ]);
      } catch {
        copied = false;
      }
    }

    if (!copied) {
      copied = copyWithSelection(url);
    }

    if (copied) {
      setManualUrl("");
      setStatus("Ссылка на расчёт скопирована");
      publishCalculatorAnalytics("share_link_copied", {
        tool_type: toolType,
        page_slug: pageSlug,
        share_method: "clipboard",
        source,
      });
      return;
    }

    setManualUrl(url);
    setStatus("Выберите и скопируйте ссылку из поля ниже");
    requestAnimationFrame(() => manualInputRef.current?.select());
  }

  return (
    <div className="mt-4 grid gap-3">
      <button
        type="button"
        onClick={handleShare}
        className="inline-flex min-h-10 w-full items-center justify-center rounded-md border border-emerald-700 bg-white px-4 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
      >
        Поделиться результатом
      </button>

      {manualUrl ? (
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Ссылка на расчёт
          <input
            ref={manualInputRef}
            readOnly
            value={manualUrl}
            onFocus={(event) => event.currentTarget.select()}
            onCopy={() =>
              publishCalculatorAnalytics("share_link_copied", {
                tool_type: toolType,
                page_slug: pageSlug,
                share_method: "manual",
                source,
              })
            }
            className="h-11 min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900"
          />
        </label>
      ) : null}

      {status ? (
        <p aria-live="polite" className="text-sm text-slate-600">
          {status}
        </p>
      ) : null}
    </div>
  );
}
