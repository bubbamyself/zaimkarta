import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getAbsoluteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [seoPages, offers] = await Promise.all([
    prisma.seoPage.findMany({
      where: {
        status: "PUBLISHED",
      },
      select: {
        slug: true,
        updatedAt: true,
      },
    }),
    prisma.offer.findMany({
      where: {
        status: "ACTIVE",
      },
      select: {
        slug: true,
        updatedAt: true,
      },
    }),
  ]);

  return [
    {
      url: getAbsoluteUrl("/"),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: getAbsoluteUrl("/blog"),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: getAbsoluteUrl("/services"),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...seoPages.map((page) => ({
      url: getAbsoluteUrl(`/${page.slug}`),
      lastModified: page.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...offers.map((offer) => ({
      url: getAbsoluteUrl(`/offers/${offer.slug}`),
      lastModified: offer.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
