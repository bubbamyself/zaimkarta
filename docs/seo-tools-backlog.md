# ZaimKarta SEO Tools Backlog

Updated: 2026-05-26

This backlog turns the SEO tools strategy into practical work streams.

## Work Streams

### 1. Global Vision

Status: completed as research, captured in `docs/seo-tools-strategy.md`.

Purpose:

- define the SEO system architecture;
- separate pages from reusable tools;
- define the role of interactive tools;
- prevent accidental WordPress-like CMS scope.

### 2. Interactive Core / SeoTool MVP

Status: next.

Purpose:

- introduce reusable interactive tools;
- implement `SeoTool`;
- implement `SeoPageTool`;
- add content block rendering for embedded tools;
- ship first tools: overpayment calculator and application readiness checklist.

Expected result:

- tools can be created in admin;
- tools can be attached to SEO pages;
- attached tools render publicly;
- calculator and checklist can be used on category, article, or service pages.

### 3. Category Editor V2

Status: after interactive core.

Purpose:

- turn category pages into focused commercial SEO pages;
- support criteria explanation;
- improve per-page offer presentation;
- attach optional interactive tools.

Expected result:

- category editor focuses on offers, order, badges, notes, CTA, risk notice, FAQ;
- public category layout keeps offers central and supports embedded tools.

### 4. Article Editor V2

Status: after interactive core.

Purpose:

- turn article pages into proper informational SEO content;
- support author/update metadata;
- support structured content;
- attach optional interactive tools.

Expected result:

- article editor focuses on lead, structure, content blocks, authoring, FAQ, related pages;
- public article layout does not look like a disguised offer showcase.

### 5. Service Pages

Status: after reusable tools exist.

Purpose:

- create standalone landing pages centered around an existing `SeoTool`.

Expected result:

- service page chooses a primary active tool;
- public service page shows the tool near the top;
- result CTA and related offers/pages are clear.

## Horizon 1: MVP

1. Add database primitives:
   - `SeoPage.contentBlocks`;
   - `SeoPage.intent`;
   - `SeoTool`;
   - `SeoPageTool`;
   - context fields on `SeoPageOffer`.

2. Build admin for interactive tools:
   - list tools;
   - create tool;
   - edit tool;
   - status;
   - type;
   - config;
   - preview;
   - usage list.

3. Build first public tool:
   - overpayment calculator.

4. Build second public tool:
   - application readiness checklist.

5. Add page-tool attachment:
   - choose existing tool;
   - choose variant;
   - set local title;
   - set local intro;
   - set position;
   - remove attachment without deleting the tool.

6. Add content block renderer:
   - `paragraph`;
   - `heading`;
   - `list`;
   - `callout`;
   - `offers`;
   - `tool`;
   - `faq`;
   - `riskNotice`;
   - `cta`.

7. Update public `/[slug]`:
   - render page by type;
   - render content blocks;
   - render attached tools;
   - keep offer tracking through `/go/[slug]`.

8. Add readiness checks:
   - general page checks;
   - category checks;
   - article checks;
   - service page checks;
   - tool checks.

## Horizon 2

- Mini offer picker.
- Standalone service page for calculator.
- Standalone service page for checklist.
- Loan type quiz.
- `relatedPages` block.
- Simple interaction tracking for tools.
- CTA tracking after tool result.
- Better preview.
- Type-specific admin guidance.

## Horizon 3

- Comparison tool.
- Content versioning.
- A/B tests.
- CPA API import.
- Automatic offer recommendations.
- Complex internal linking graph.
- Editorial roles.
- Full visual CMS.
- Complex rating system.

## Implementation Notes

- Keep tools reusable.
- Do not store tool logic only inside page JSON.
- Keep FAQ structured.
- Keep offer context in `SeoPageOffer`.
- Do not require every article or category to have a tool.
- Do require service pages to have a primary active tool.
- Avoid collecting personal data in tools.
- Make calculator results approximate and clearly explained.
- Always provide a next step after tool result.

## Current Next Prompt

The next focused dialog should use `docs/prompts/interactive-core-seotool-mvp.md`.
