"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  CALCULATOR_ANALYTICS_EVENT,
  type CalculatorAnalyticsDetail,
} from "@/lib/calculator-analytics";
import { sanitizeCalculatorAnalyticsUrl } from "@/lib/calculator-share";
import {
  PUBLIC_SHARE_ANALYTICS_EVENT,
  type PublicShareAnalyticsDetail,
} from "@/lib/public-page-share";
import {
  isValidMetrikaClientId,
  OFFER_CLICK_ANALYTICS_EVENT,
  OFFER_CLICK_GOAL,
  type OfferClickAnalyticsDetail,
  type YandexMetrika as YandexMetrikaFunction,
} from "@/lib/metrika-client";

const COOKIE_NOTICE_COOKIE_NAME = "zk_cookie_notice_accepted";
const COOKIE_CONSENT_EVENT = "zk-cookie-consent-accepted";

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

  const ym: YandexMetrikaFunction = (...args: unknown[]) => {
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

      const currentUrl = sanitizeCalculatorAnalyticsUrl(window.location.href);

      if (previousUrl.current === currentUrl) {
        return;
      }

      const ym = initializeMetrika(counterId);

      ym(counterId, "hit", currentUrl, {
        title: document.title,
        referer:
          previousUrl.current ??
          sanitizeCalculatorAnalyticsUrl(document.referrer),
      });

      previousUrl.current = currentUrl;
    }

    trackPageView();
    window.addEventListener(COOKIE_CONSENT_EVENT, trackPageView);

    return () => {
      window.removeEventListener(COOKIE_CONSENT_EVENT, trackPageView);
    };
  }, [counterId, pathname, query]);

  useEffect(() => {
    function trackOfferClick(event: Event) {
      const detail = (event as CustomEvent<OfferClickAnalyticsDetail>).detail;

      if (!detail?.params || typeof detail.complete !== "function") {
        return;
      }

      detail.accept();

      if (!hasCookieConsent()) {
        detail.complete(null);
        return;
      }

      try {
        const ym = initializeMetrika(counterId);
        let clientId: string | null = null;
        let clientIdReceived = false;
        let goalSent = false;
        let completed = false;
        const completeWhenReady = () => {
          if (!completed && clientIdReceived && goalSent) {
            completed = true;
            detail.complete(clientId);
          }
        };

        ym(counterId, "getClientID", (value: unknown) => {
          clientId = isValidMetrikaClientId(value) ? value : null;
          clientIdReceived = true;
          completeWhenReady();
        });
        ym(counterId, "reachGoal", OFFER_CLICK_GOAL, detail.params, () => {
          goalSent = true;
          completeWhenReady();
        });
      } catch {
        detail.complete(null);
      }
    }

    window.addEventListener(OFFER_CLICK_ANALYTICS_EVENT, trackOfferClick);

    return () => {
      window.removeEventListener(OFFER_CLICK_ANALYTICS_EVENT, trackOfferClick);
    };
  }, [counterId]);

  useEffect(() => {
    function trackCalculatorGoal(event: Event) {
      if (!hasCookieConsent()) {
        return;
      }

      const detail = (event as CustomEvent<CalculatorAnalyticsDetail>).detail;

      if (!detail?.goal || !detail.params) {
        return;
      }

      const ym = initializeMetrika(counterId);
      ym(counterId, "reachGoal", detail.goal, detail.params);
    }

    window.addEventListener(CALCULATOR_ANALYTICS_EVENT, trackCalculatorGoal);

    return () => {
      window.removeEventListener(CALCULATOR_ANALYTICS_EVENT, trackCalculatorGoal);
    };
  }, [counterId]);

  useEffect(() => {
    function trackPublicShareGoal(event: Event) {
      if (!hasCookieConsent()) {
        return;
      }

      const detail = (event as CustomEvent<PublicShareAnalyticsDetail>).detail;

      if (!detail?.goal || !detail.params) {
        return;
      }

      const ym = initializeMetrika(counterId);
      ym(counterId, "reachGoal", detail.goal, detail.params);
    }

    window.addEventListener(PUBLIC_SHARE_ANALYTICS_EVENT, trackPublicShareGoal);

    return () => {
      window.removeEventListener(
        PUBLIC_SHARE_ANALYTICS_EVENT,
        trackPublicShareGoal,
      );
    };
  }, [counterId]);

  return null;
}
