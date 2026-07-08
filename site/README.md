# ZaimKarta Site

This is the Next.js application for ZaimKarta — an owner-operated SEO showcase for microloan and financial CPA offers.

## Current Product Notes

Implemented foundation:

- public offer showcase;
- admin offer management;
- CPA redirect flow through `/go/[slug]`;
- `lead_id`, `click_id`, and click tracking;
- SEO pages and SEO tools foundation;
- admin analytics and report export;
- offer ordering and status management;
- region-based offer filtering MVP.

## Region-Based Offer Filtering

Implemented on 2026-07-09.

The site can filter offers by the user's registration region:

- public users choose a registration region;
- the choice is stored in cookie `zk_region_code`;
- admins can set offer-level regional restrictions;
- restrictions are stored in `Offer.restrictedRegionCodes`;
- homepage and SEO pages hide offers restricted for the selected region;
- `/go/[slug]` protects CPA redirects server-side and does not send users to restricted offers.

Main files:

- `src/lib/russian-regions.ts`;
- `src/lib/region-cookie.ts`;
- `src/components/region-registration-control.tsx`;
- `src/app/admin/region-restrictions-field.tsx`;
- `src/lib/offers.ts`;
- `src/lib/cpa-click.ts`;
- `prisma/migrations/20260630090000_offer_restricted_region_codes/migration.sql`.

Full product/technical note:

```text
../docs/region-registration-offer-filter.md
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
