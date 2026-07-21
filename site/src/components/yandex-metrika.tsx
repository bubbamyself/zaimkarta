"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const COOKIE_NOTICE_COOKIE_NAME = "zk_cookie_notice_accepted";
const COOKIE_CONSENT_EVENT = "zk-cookie-consent-accepted";

type YandexMetrika = ((...args: unknown[]) => void) & {
  a?: unknown[][];
  l?: number;
};

declare global {
  interface Window {
    ym?: YandexMetrika;
  }
}

function hasCookieConsent() {
  return document.cookie
    .split(";")
    .map((item) => item.trim())
    .includes(`${COOKIE_NOTICE_COOKIE_NAME}=1`);
}

function initializeMetrika(counterId: number) {
  if (window.ym) {
    return window.ym;
  }

  const tagUrl = `https://mc.yandex.ru/metrika/tag.js?id=${counterId}`;

  const ym: YandexMetrika = (...args: unknown[]) => {
    (ym.a ??= []).push(args);
  };

  ym.l = Date.now();
  window.ym = ym;

  if (!Array.from(document.scripts).some((script) => script.src === tagUrl)) {
    const script = document.createElement("script");
    script.async = true;
    script.src = tagUrl;
    document.head.appendChild(script);
  }

  ym(counterId, "init", {
    defer: true,
    ssr: true,
    webvisor: true,
    clickmap: true,
    ecommerce: "dataLayer",
    accurateTrackBounce: true,
    trackLinks: true,
  });

  return ym;
}

export function YandexMetrika({ counterId }: { counterId: number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const previousUrl = useRef<string | null>(null);

  useEffect(() => {
    function trackPageView() {
      if (!hasCookieConsent()) {
        return;
      }

      const currentUrl = window.location.href;

      if (previousUrl.current === currentUrl) {
        return;
      }

      const ym = initializeMetrika(counterId);

      ym(counterId, "hit", currentUrl, {
        title: document.title,
        referer: previousUrl.current ?? document.referrer,
      });

      previousUrl.current = currentUrl;
    }

    trackPageView();
    window.addEventListener(COOKIE_CONSENT_EVENT, trackPageView);

    return () => {
      window.removeEventListener(COOKIE_CONSENT_EVENT, trackPageView);
    };
  }, [counterId, pathname, query]);

  return null;
}
