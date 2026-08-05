"use client";

import { useRef, useState } from "react";
import {
  buildPublicPageShareUrl,
  publishPublicShareAnalytics,
  type PublicSharePageType,
} from "@/lib/public-page-share";

type PublicPageShareButtonProps = {
  pageType: PublicSharePageType;
  pageSlug: string;
  pathname: string;
  title: string;
  text: string;
  label: string;
  copiedLabel: string;
  className?: string;
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

export function PublicPageShareButton({
  pageType,
  pageSlug,
  pathname,
  title,
  text,
  label,
  copiedLabel,
  className = "",
}: PublicPageShareButtonProps) {
  const [status, setStatus] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const manualInputRef = useRef<HTMLInputElement>(null);

  function createTrackedUrl() {
    const url = buildPublicPageShareUrl({
      origin: window.location.origin,
      pathname,
      pageType,
      pageSlug,
    });
    publishPublicShareAnalytics("page_share_link_created", {
      page_type: pageType,
      page_slug: pageSlug,
    });
    return url;
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
      setStatus(copiedLabel);
      publishPublicShareAnalytics("page_share_link_copied", {
        page_type: pageType,
        page_slug: pageSlug,
        share_method: "clipboard",
      });
      return;
    }

    setManualUrl(url);
    setStatus("Выберите и скопируйте ссылку из поля ниже");
    requestAnimationFrame(() => manualInputRef.current?.select());
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
    publishPublicShareAnalytics("page_share_native_opened", {
      page_type: pageType,
      page_slug: pageSlug,
      share_method: "native",
    });

    try {
      await navigator.share({ title, text, url });
      setStatus("Системное меню отправки завершило работу");
      publishPublicShareAnalytics("page_share_native_completed", {
        page_type: pageType,
        page_slug: pageSlug,
        share_method: "native",
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

  return (
    <div className={`grid gap-2 ${className}`.trim()}>
      <button
        type="button"
        onClick={handleShare}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-emerald-700 bg-white px-4 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 10.5 6.8-4" />
          <path d="m8.6 13.5 6.8 4" />
        </svg>
        {label}
      </button>

      {manualUrl ? (
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Ссылка на ZaimKarta
          <input
            ref={manualInputRef}
            readOnly
            value={manualUrl}
            onFocus={(event) => event.currentTarget.select()}
            onCopy={() =>
              publishPublicShareAnalytics("page_share_link_copied", {
                page_type: pageType,
                page_slug: pageSlug,
                share_method: "manual",
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
