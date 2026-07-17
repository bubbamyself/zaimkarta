# Production Launch Checklist

Use this checklist before deploying ZaimKarta to production.

## Environment

- [ ] `NEXT_PUBLIC_SITE_URL=https://zaimkarta.ru`
- [ ] `DATABASE_URL` points to the production PostgreSQL database.
- [ ] `ADMIN_SESSION_SECRET` is set to a strong unique secret.
- [ ] `LEAD_IP_HASH_SALT` is set to a strong unique secret.
- [ ] Local-only values such as `localhost`, demo passwords, and development database URLs are not used in production.

## Domain And HTTPS

- [ ] Main production domain is `https://zaimkarta.ru`.
- [ ] HTTPS certificate is active.
- [ ] `http://zaimkarta.ru` redirects to `https://zaimkarta.ru`.
- [ ] `https://www.zaimkarta.ru` redirects to `https://zaimkarta.ru`.
- [ ] No public production page returns `localhost` in HTML, metadata, JSON-LD, canonical, or breadcrumbs.

## Database

- [ ] Prisma migrations are applied.
- [ ] Migration `20260630090000_offer_restricted_region_codes` is applied.
- [ ] Admin users are created intentionally.
- [ ] Seed/demo data is reviewed before publication.
- [ ] Demo CPA links such as `example.com` are removed or paused.
- [ ] Published offers have active HTTPS CPA links.

## Checks

- [ ] `npm run lint` passes.
- [ ] `NEXT_PUBLIC_SITE_URL=https://zaimkarta.ru npm run build` passes.
- [ ] GitHub Actions are green on the production branch.

## SEO Infrastructure

- [ ] `robots.txt` exists and does not accidentally block public SEO pages.
- [ ] `sitemap.xml` exists and contains published SEO pages and public offer pages.
- [ ] Canonical URLs are present on `/`, `/${slug}`, and `/offers/${slug}`.
- [ ] Canonical URLs use `https://zaimkarta.ru`, not `localhost`.
- [ ] Breadcrumbs are visible on public SEO pages.
- [ ] `BreadcrumbList` JSON-LD uses absolute `https://zaimkarta.ru` URLs.
- [ ] Admin pages are `noindex`.
- [ ] `/go/[slug]`, `/api/*`, and `/admin/*` are not added to sitemap.

## Public Site

- [ ] Public pages open on `https://zaimkarta.ru`.
- [ ] Region selector is visible and saves `zk_region_subject_code_v2`.
- [ ] Offers restricted by `Offer.restrictedRegionCodes` are hidden for the selected registration region.
- [ ] CPA redirects use `/go/[slug]` and record clicks.
- [ ] `/go/[slug]` does not redirect to CPA if the offer is restricted for the selected region.
- [ ] Old `/api/offers/[slug]/click` redirects to `/go/[slug]` only as compatibility.
- [ ] Legal and risk notices are visible where needed.
- [ ] SEO pages have title, description, H1, canonical URL, and breadcrumbs where applicable.
- [ ] Published category pages have at least one active offer with an active CPA link.
- [ ] Published service pages have an active tool.
- [ ] Published articles have useful content, FAQ where needed, and no fake commercial promises.
- [ ] No public copy promises `100% одобрение`, `гарантированно`, `деньги всем`, or similar unsafe claims.

## Manual Smoke Test

- [ ] Open `/`.
- [ ] Open one category page, for example `/zaimy-na-kartu`.
- [ ] Open one article page.
- [ ] Open one service page.
- [ ] Open one offer page, for example `/offers/zaymer`.
- [ ] Choose one registration region and confirm the region button reflects the choice.
- [ ] Add a test regional restriction to one offer in admin and confirm it disappears from public listings for that region.
- [ ] Click one offer CTA and confirm it goes through `/go/[slug]`.
- [ ] Confirm restricted offer CTA falls back safely instead of sending the user to CPA.
- [ ] Confirm a click appears in admin analytics.
