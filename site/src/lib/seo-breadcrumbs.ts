import type { SeoPage } from "@prisma/client";
import type { BreadcrumbItem } from "@/components/breadcrumbs";
import { getAbsoluteUrl } from "@/lib/site-url";

type SeoPageBreadcrumbSource = Pick<SeoPage, "h1" | "pageType">;

type BreadcrumbListItem = {
  "@type": "ListItem";
  position: number;
  name: string;
  item: string;
};

type BreadcrumbListJsonLd = {
  "@context": "https://schema.org";
  "@type": "BreadcrumbList";
  itemListElement: BreadcrumbListItem[];
};

const PAGE_TYPE_BREADCRUMBS: Record<
  SeoPageBreadcrumbSource["pageType"],
  BreadcrumbItem
> = {
  CATEGORY: {
    label: "Подборки",
    href: "/#categories",
  },
  ARTICLE: {
    label: "Статьи",
    href: "/#articles",
  },
  SERVICE: {
    label: "Сервисы",
    href: "/#services",
  },
};

export function getSeoPageBreadcrumbs(
  page: SeoPageBreadcrumbSource,
): BreadcrumbItem[] {
  return [
    {
      label: "Главная",
      href: "/",
    },
    PAGE_TYPE_BREADCRUMBS[page.pageType],
    {
      label: page.h1,
    },
  ];
}

export function getBreadcrumbListJsonLd(
  items: BreadcrumbItem[],
  currentPath: string,
): BreadcrumbListJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: getAbsoluteUrl(item.href ?? currentPath),
    })),
  };
}
