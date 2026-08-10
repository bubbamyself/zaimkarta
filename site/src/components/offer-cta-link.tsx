"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { buildAttributedGoHref } from "@/lib/offer-attribution";
import { REGION_SELECTOR_OPEN_EVENT } from "@/lib/region-cookie-config";

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
        event.currentTarget.href = buildAttributedGoHref(
          href,
          window.location.search,
        );
      }}
      className={className}
    >
      {children}
    </a>
  );
}
