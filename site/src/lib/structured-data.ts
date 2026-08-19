import { getAbsoluteUrl } from "@/lib/site-url";

const WEBSITE_ID = getAbsoluteUrl("/#website");
const ORGANIZATION_ID = getAbsoluteUrl("/#organization");
const EDITORIAL_TEAM_ID = getAbsoluteUrl("/#editorial-team");

type ArticleJsonLdInput = {
  path: string;
  headline: string;
  description: string;
  datePublished: Date;
  dateModified: Date;
};

type FaqJsonLdItem = {
  question: string;
  answer: string;
};

type CategoryCollectionJsonLdInput = {
  path: string;
  name: string;
  description: string;
  dateModified: Date;
  items: Array<{
    name: string;
    path: string;
  }>;
};

export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function getSiteIdentityJsonLd() {
  const siteUrl = getAbsoluteUrl("/");

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: siteUrl,
        name: "ZaimKarta",
        alternateName: "zaimkarta.ru",
        inLanguage: "ru-RU",
        publisher: {
          "@id": ORGANIZATION_ID,
        },
      },
      {
        "@type": "Organization",
        "@id": ORGANIZATION_ID,
        name: "ZaimKarta",
        legalName: "ООО «ВР»",
        url: siteUrl,
        logo: getAbsoluteUrl("/icon.png"),
        email: "zabota@zaimkarta.ru",
      },
    ],
  };
}

export function getArticleJsonLd({
  path,
  headline,
  description,
  datePublished,
  dateModified,
}: ArticleJsonLdInput) {
  const url = getAbsoluteUrl(path);

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    headline,
    description,
    datePublished: datePublished.toISOString(),
    dateModified: dateModified.toISOString(),
    inLanguage: "ru-RU",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    author: {
      "@type": "Organization",
      "@id": EDITORIAL_TEAM_ID,
      name: "Редакция ZaimKarta",
      url: getAbsoluteUrl("/editorial-guidelines"),
      parentOrganization: {
        "@id": ORGANIZATION_ID,
      },
    },
    publisher: {
      "@type": "Organization",
      "@id": ORGANIZATION_ID,
      name: "ZaimKarta",
      logo: {
        "@type": "ImageObject",
        url: getAbsoluteUrl("/icon.png"),
      },
    },
  };
}

export function getFaqPageJsonLd(items: FaqJsonLdItem[]) {
  if (items.length === 0) {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function getCategoryCollectionJsonLd({
  path,
  name,
  description,
  dateModified,
  items,
}: CategoryCollectionJsonLdInput) {
  const url = getAbsoluteUrl(path);

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${url}#collection`,
    url,
    name,
    description,
    inLanguage: "ru-RU",
    dateModified: dateModified.toISOString(),
    isPartOf: {
      "@id": WEBSITE_ID,
    },
    publisher: {
      "@id": ORGANIZATION_ID,
    },
    mainEntity: {
      "@type": "ItemList",
      "@id": `${url}#offers`,
      name: `Предложения в подборке «${name}»`,
      numberOfItems: items.length,
      itemListOrder: "https://schema.org/ItemListOrderAscending",
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "WebPage",
          "@id": getAbsoluteUrl(item.path),
          url: getAbsoluteUrl(item.path),
          name: item.name,
        },
      })),
    },
  };
}
