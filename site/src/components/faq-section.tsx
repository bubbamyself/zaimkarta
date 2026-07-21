import type { SeoPageStatus, SeoPageType } from "@prisma/client";
import Link from "next/link";

export type FaqItemWithLinkedPage = {
  id: string;
  question: string;
  answer: string;
  linkedSeoPage?: {
    slug: string;
    status: SeoPageStatus;
    pageType: SeoPageType;
    h1: string;
    title: string;
  } | null;
};

type FaqSectionProps = {
  items: FaqItemWithLinkedPage[];
  title?: string;
  className?: string;
};

export function FaqSection({
  items,
  title = "Вопросы и ответы",
  className = "mx-auto max-w-3xl px-5 py-12",
}: FaqSectionProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className={className}>
      <h2 className="text-2xl font-bold text-slate-950">{title}</h2>
      <div className="mt-6 grid gap-3">
        {items.map((item) => {
          const linkedSeoPage =
            item.linkedSeoPage?.status === "PUBLISHED" &&
            item.linkedSeoPage.pageType === "ARTICLE"
              ? item.linkedSeoPage
              : null;
          const linkedSeoPageTitle = linkedSeoPage?.h1 || linkedSeoPage?.title;

          return (
            <details
              key={item.id}
              className="rounded-lg border border-slate-200 bg-white p-5"
            >
              <summary className="cursor-pointer font-semibold text-slate-950">
                {item.question}
              </summary>
              <p className="mt-3 leading-7 text-slate-600">{item.answer}</p>
              {linkedSeoPage && linkedSeoPageTitle ? (
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Подробнее:{" "}
                  <Link
                    href={`/${linkedSeoPage.slug}`}
                    className="font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    {linkedSeoPageTitle}
                  </Link>
                </p>
              ) : null}
            </details>
          );
        })}
      </div>
    </section>
  );
}
