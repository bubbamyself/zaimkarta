"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { buildAttributedGoHref } from "@/lib/offer-attribution";

export function OfferCtaLink({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: ReactNode;
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
