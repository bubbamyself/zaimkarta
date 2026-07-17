import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";

const MAX_FOOTER_CATEGORIES = 12;

export async function SiteFooter() {
  await connection();

  const categories = await prisma.seoPage.findMany({
    where: {
      status: "PUBLISHED",
      pageType: "CATEGORY",
    },
    orderBy: [{ displayPriority: "asc" }, { createdAt: "asc" }],
    take: MAX_FOOTER_CATEGORIES + 1,
    select: {
      slug: true,
      h1: true,
      title: true,
    },
  });

  const visibleCategories = categories.slice(0, MAX_FOOTER_CATEGORIES);
  const hasMoreCategories = categories.length > MAX_FOOTER_CATEGORIES;
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-slate-50 text-slate-800">
      <div className="mx-auto max-w-6xl px-5 py-10 md:py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.35fr_1fr_0.8fr_1fr] lg:gap-10">
          <section aria-labelledby="footer-about-title">
            <Link href="/" className="inline-flex items-center">
              <Image
                src="/ZK_Logo.png"
                alt="ZaimKarta"
                width={2172}
                height={724}
                className="h-auto w-48"
              />
            </Link>
            <h2 id="footer-about-title" className="sr-only">
              О сервисе ZaimKarta
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-6 text-slate-600">
              ZaimKarta — информационный сервис сравнения предложений
              микрофинансовых организаций. Мы помогаем сопоставить суммы, сроки,
              ставки и другие условия кредиторов.
            </p>
          </section>

          <nav aria-labelledby="footer-categories-title">
            <h2
              id="footer-categories-title"
              className="text-sm font-bold text-slate-950"
            >
              Подборки займов
            </h2>
            {visibleCategories.length > 0 ? (
              <ul className="mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-2 md:grid-cols-1">
                {visibleCategories.map((category) => (
                  <li key={category.slug} className="min-w-0">
                    <Link
                      href={`/${category.slug}`}
                      className="break-words text-sm leading-5 text-slate-600 transition hover:text-emerald-800"
                    >
                      {category.h1 || category.title}
                    </Link>
                  </li>
                ))}
                {hasMoreCategories ? (
                  <li>
                    <Link
                      href="/#categories"
                      className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-900"
                    >
                      Все подборки
                    </Link>
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="mt-4 text-sm leading-6 text-slate-500">
                Опубликованные подборки скоро появятся.
              </p>
            )}
          </nav>

          <nav aria-labelledby="footer-useful-title">
            <h2
              id="footer-useful-title"
              className="text-sm font-bold text-slate-950"
            >
              Полезное
            </h2>
            <ul className="mt-4 grid gap-3 text-sm">
              <li>
                <Link
                  href="/#offers"
                  className="text-slate-600 transition hover:text-emerald-800"
                >
                  Предложения
                </Link>
              </li>
              <li>
                <Link
                  href="/services"
                  className="text-slate-600 transition hover:text-emerald-800"
                >
                  Сервисы и калькуляторы
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="text-slate-600 transition hover:text-emerald-800"
                >
                  Полезные статьи
                </Link>
              </li>
            </ul>
          </nav>

          <div className="grid content-start gap-8">
            <section aria-labelledby="footer-contact-title">
              <h2
                id="footer-contact-title"
                className="text-sm font-bold text-slate-950"
              >
                Связаться с нами
              </h2>
              <a
                href="mailto:zabota@zaimkarta.ru"
                className="mt-4 inline-block break-all text-sm text-emerald-700 transition hover:text-emerald-900"
              >
                zabota@zaimkarta.ru
              </a>
            </section>

            <nav aria-labelledby="footer-documents-title">
              <h2
                id="footer-documents-title"
                className="text-sm font-bold text-slate-950"
              >
                Документы
              </h2>
              <ul className="mt-4 grid gap-3 text-sm">
                <li>
                  <Link
                    href="/privacy-policy"
                    className="text-slate-600 transition hover:text-emerald-800"
                  >
                    Персональные данные и cookies
                  </Link>
                </li>
                <li>
                  <Link
                    href="/rules"
                    className="text-slate-600 transition hover:text-emerald-800"
                  >
                    Правила использования
                  </Link>
                </li>
                <li>
                  <Link
                    href="/editorial-guidelines"
                    className="text-slate-600 transition hover:text-emerald-800"
                  >
                    Редакционная политика
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-200 pt-8 text-xs leading-5 text-slate-500 md:mt-12">
          <p>
            Владелец сервиса: ООО «ВР». ИНН 5503267433, КПП 550301001.
            Юридический адрес: 644046, г. Омск, ул. Куйбышева, д. 136, кв. 199.
          </p>

          <div className="mt-5 grid gap-4 lg:grid-cols-3 lg:gap-8">
            <p>
              ZaimKarta не является банком, микрофинансовой организацией или
              кредитором, не выдаёт займы и не принимает решения об одобрении
              заявок. Решение принимает соответствующая финансовая организация.
            </p>
            <p>
              Информация на сайте носит справочный характер и не является
              индивидуальной финансовой рекомендацией или публичной офертой.
              Перед оформлением необходимо проверить полную стоимость займа и
              условия договора на сайте кредитора.
            </p>
            <p>
              ZaimKarta может получать вознаграждение от партнёров за переходы
              пользователей или оформленные финансовые продукты. Это может
              влиять на состав и порядок размещения предложений.
            </p>
          </div>

          <p className="mt-7 font-medium text-slate-600">
            © {currentYear} ZaimKarta.ru
          </p>
        </div>
      </div>
    </footer>
  );
}
