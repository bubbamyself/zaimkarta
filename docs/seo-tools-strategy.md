# ZaimKarta SEO Tools Strategy

Updated: 2026-05-26

## Role Of This Document

This document is the project memory for the ZaimKarta SEO tools direction. It captures product decisions that should not live only in chat history.

The current working process:

- The main Codex dialog is the project headquarters.
- Separate dialogs can be used for focused research or implementation prompts.
- Results from focused dialogs return to the main dialog before becoming development tasks.
- Product decisions are recorded here and converted into the backlog in `docs/seo-tools-backlog.md`.

## Product Context

ZaimKarta is an owner-operated SEO showcase for microloan offers. The owner chooses CPA offers, adds them to the admin panel, decides which offers appear on the site, and controls SEO pages.

ZaimKarta is not:

- a marketplace for CPA networks;
- an external advertiser cabinet;
- a borrower account;
- a forum;
- a user reviews platform;
- a WordPress-like CMS.

## Current Foundation

Already implemented:

- manual offer creation and editing in the admin panel;
- public offer data;
- affiliate link management;
- offer status and display priority;
- conditions checked date;
- public CPA transition through `/go/[slug]`;
- `lead_id` and `click_id` creation;
- `OfferClick` tracking;
- tracking/sub-parameters in redirect URLs;
- `SeoPage`;
- `SeoPageOffer`;
- `SeoPageFaqItem`;
- `CATEGORY`, `ARTICLE`, `SERVICE` page types;
- `DRAFT`, `PUBLISHED`, `PAUSED`, `ARCHIVED` page statuses;
- public `/[slug]` route reading SEO pages from the database;
- basic SEO page admin editor;
- offer selection and ordering per SEO page;
- FAQ editing per SEO page.

## Core Vision

ZaimKarta should evolve from a card showcase into an SEO system where users read, compare, calculate, check, choose, and receive useful results.

The SEO system has three layers:

- SEO pages: category selections, articles, and service landing pages.
- Reusable interactive tools: calculators, checklists, quizzes, mini offer pickers, comparison tools.
- Commercial layer: offers, CTA, `/go/[slug]`, `lead_id`, `click_id`, `OfferClick`, and CPA tracking.

The key product hypothesis:

Interactive tools can improve trust, behavioral signals, internal linking, and conversion because the user does not only read the page, but performs a useful action.

## Key Product Decision

Interactive services are not a third page type to postpone. They are reusable SEO tools.

An interactive tool can:

- have its own service page;
- be embedded in a category page;
- be embedded in an article;
- later be embedded on the home page or special landing pages.

Examples:

- overpayment calculator inside `zaimy-na-kartu`;
- application readiness checklist inside an article;
- loan type quiz inside a service page;
- mini offer picker inside a commercial category page.

## Entity Map

### `Offer`

The microloan offer. It remains the source of shared offer data and affiliate links.

### `SeoPage`

The public SEO page. It closes a specific search intent and may be:

- `CATEGORY`: commercial selection;
- `ARTICLE`: informational content;
- `SERVICE`: utility page centered around an interactive tool.

Recommended additions:

- `intent`;
- `contentBlocks`;
- `leadText`;
- `authorName`;
- `authorBio`;
- `reviewedBy`;
- `contentUpdatedAt`;
- `riskNoticeMode`;
- `canonicalUrl`;
- `noindex`.

Page type and intent should be separate:

- `pageType` is the page format.
- `intent` is the search intent.

### `SeoTool`

Reusable interactive tool. It is not a page.

Potential tool types:

- `OVERPAYMENT_CALCULATOR`;
- `APPLICATION_CHECKLIST`;
- `MINI_OFFER_PICKER`;
- `LOAN_TYPE_QUIZ`;
- `COMPARISON`.

MVP priority:

- overpayment calculator;
- application readiness checklist.

### `SeoPageTool`

Contextual connection between a page and a tool.

It allows one tool to be embedded on different pages with local overrides:

- position;
- block id;
- display variant;
- local title;
- local intro;
- local config.

### `SeoPageOffer`

Contextual connection between a page and an offer.

Recommended additions:

- `badge`;
- `note`;
- `highlight`;
- `ctaText`.

This matters because the same offer can be presented differently on different pages.

### `SeoPageFaqItem`

Structured FAQ item for a specific page. It should remain separate from free-form content because FAQ needs validation, rendering, and potential structured data.

### `contentBlocks`

Simple JSON structure for assembling page bodies without creating a full visual CMS.

MVP block types:

- `paragraph`;
- `heading`;
- `list`;
- `callout`;
- `table`;
- `offers`;
- `tool`;
- `faq`;
- `relatedPages`;
- `riskNotice`;
- `cta`.

## Architectural Decision: `SeoTool` Plus `contentBlocks`

Use a hybrid model:

- add `SeoTool` as a separate entity;
- add `SeoPage.contentBlocks`;
- allow a `tool` block in `contentBlocks`;
- connect pages and tools through `SeoPageTool`.

Reason:

- putting full tool config only inside `contentBlocks` is faster but weak for reuse;
- a separate `SeoTool` can be embedded across pages, get a standalone page, and later receive analytics;
- `contentBlocks` still controls where and how the tool appears inside a page.

## Public Layout Principles

### Category Page

Main element: offers.

Expected structure:

- H1;
- lead;
- risk notice in a visible zone;
- optional embedded tool;
- offer list;
- explanatory content;
- FAQ;
- related articles/services;
- repeated CTA.

Offers should not be buried too low on commercial pages.

### Article Page

Main element: informational answer.

Expected structure:

- H1;
- lead;
- author/update metadata;
- main text;
- optional embedded tool if useful;
- soft offer block if relevant;
- risk notice;
- FAQ;
- related categories/services.

Article pages should not look like disguised offer showcases.

### Service Page

Main element: interactive tool.

Expected structure:

- H1;
- short value explanation;
- tool near the top;
- result explanation;
- CTA after result;
- relevant offers or category links;
- explanatory content;
- FAQ;
- risk notice;
- related pages.

## Admin Principles

Do not build one universal editor for everything.

Use:

- shared base fields;
- separate editors for category pages, articles, service pages, and tools;
- separate admin section for interactive tools.

Interactive tools are created and configured in "Interactive Tools". Category and article editors only attach existing tools when useful.

## Admin UX Principle: No Raw JSON

JSON can be used as an internal storage format for `SeoTool.config`, `SeoPage.contentBlocks`, and local page-tool overrides, but raw JSON must not be the primary admin interface.

The site owner should work through clear controls:

- text inputs;
- textareas;
- selects;
- toggles and checkboxes;
- repeatable lists;
- add, remove, and move controls;
- type-specific forms for calculators, checklists, and future tools.

Every JSON-backed feature needs mappers:

- form fields to structured JSON;
- structured JSON to form fields.

Raw JSON may appear only as a developer/debug view. It should not be the owner-facing editing experience.

## Publication Rules

Common SEO page checks:

- slug exists and is unique;
- title exists;
- description exists;
- H1 exists;
- lead exists;
- risk notice exists;
- status is valid;
- no empty content blocks;
- no broken offer references;
- no broken tool references;
- no published page uses archived tools;
- noindex/canonical are intentional.

Category checks:

- at least 3 active offers;
- offers are sorted;
- offer conditions are checked;
- criteria explanation exists;
- FAQ exists;
- risk notice is visible;
- attached tools are active.

Article checks:

- sufficient text content;
- H2/H3 structure exists;
- author exists;
- update date exists;
- relevant internal link exists;
- offers are optional and should be contextually relevant;
- attached tools must support the article topic.

Service page checks:

- active primary `SeoTool` exists;
- tool works in preview;
- result explanation exists;
- CTA after result exists;
- FAQ exists;
- related category/article links exist;
- risk notice exists.

Tool checks:

- type exists;
- name/title exists;
- config is valid;
- status is valid;
- public component exists for active tool type;
- active or used tools cannot be archived without warning.

## Direction Priorities

1. Interactive core: `SeoTool`, `SeoPageTool`, calculator, checklist.
2. Category editor v2: commercial layout plus optional embedded tools.
3. Article editor v2: structured article layout plus optional embedded tools.
4. Service pages: standalone pages centered around existing tools.
5. Later: mini offer picker, quiz, comparison, analytics, preview improvements.

## SEO Infrastructure

- Breadcrumbs are rendered on public SEO pages from `SeoPage.pageType`: home, section anchor, current page.
- MVP section levels are `Подборки`, `Статьи`, and `Сервисы`; they use homepage anchors instead of separate index pages.
- Public SEO pages also emit `BreadcrumbList` JSON-LD with absolute URLs.

## Non-Goals

Do not build now:

- full visual builder;
- WordPress-like CMS;
- user accounts;
- personal data collection;
- reviews;
- forum;
- CPA advertiser cabinet;
- CPA API import as MVP requirement;
- complex rating system;
- A/B tests;
- content versioning.
