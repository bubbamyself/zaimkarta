"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { buildAttributedGoHref } from "@/lib/offer-attribution";
import {
  appendMetrikaClientId,
  dispatchOfferClickAnalytics,
  getOfferClickGoalParams,
} from "@/lib/metrika-client";
import { REGION_SELECTOR_OPEN_EVENT } from "@/lib/region-cookie-config";

const METRIKA_NAVIGATION_TIMEOUT_MS = 400;

export function OfferCtaLink({
  href,
  className,
  children,
  regionSelected,
  regionRequiredText = "Проверить доступность",
}: {
  href: string;
  className: string;
  children: ReactNode;
  regionSelected: boolean;
  regionRequiredText?: string;
}) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const navigationPending = useRef(false);

  useEffect(() => {
    if (linkRef.current) {
      linkRef.current.href = buildAttributedGoHref(
        href,
        window.location.search,
      );
    }
  }, [href]);

  if (!regionSelected) {
    return (
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event(REGION_SELECTOR_OPEN_EVENT))}
        className={className}
      >
        {regionRequiredText}
      </button>
    );
  }

  return (
    <a
      ref={linkRef}
      href={href}
      onClick={(event) => {
        const attributedHref = buildAttributedGoHref(
          href,
          window.location.search,
        );
        event.currentTarget.href = attributedHref;
        const params = getOfferClickGoalParams(attributedHref);

        if (!params) {
          return;
        }

        const isRegularNavigation =
          event.button === 0 &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.shiftKey &&
          !event.altKey;

        if (!isRegularNavigation) {
          dispatchOfferClickAnalytics(params, () => undefined);
          return;
        }

        event.preventDefault();

        if (navigationPending.current) {
          return;
        }

        navigationPending.current = true;
        let finished = false;
        let timeoutId: number | null = null;
        const navigate = (clientId: string | null) => {
          if (finished) {
            return;
          }

          finished = true;

          if (timeoutId !== null) {
            window.clearTimeout(timeoutId);
          }

          window.location.assign(appendMetrikaClientId(attributedHref, clientId));
        };
        const accepted = dispatchOfferClickAnalytics(params, navigate);

        if (!accepted) {
          navigate(null);
          return;
        }

        timeoutId = window.setTimeout(
          () => navigate(null),
          METRIKA_NAVIGATION_TIMEOUT_MS,
        );
      }}
      className={className}
    >
      {children}
    </a>
  );
}
