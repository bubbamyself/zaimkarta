import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAbsoluteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Редакционная политика — ZaimKarta",
  description:
    "Принципы проверки, обновления и коммерческого раскрытия материалов ZaimKarta о микрозаймах.",
  alternates: {
    canonical: getAbsoluteUrl("/editorial-guidelines"),
  },
};

const sectionClassName = "grid gap-4";
const headingClassName = "text-2xl font-bold leading-tight text-slate-950";
const paragraphClassName = "leading-7 text-slate-700";
const listClassName = "grid list-disc gap-2 pl-5 leading-7 text-slate-700";

export default function EditorialGuidelinesPage() {
  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <SiteHeader />
      <article className="mx-auto max-w-4xl px-5 py-10 md:py-14">
        <p className="text-sm font-semibold uppercase text-emerald-700">
          Документы
        </p>
        <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
          Редакционная политика
        </h1>
        <p className="mt-4 text-sm text-slate-500">
          Редакция от 18 июля 2026 года
        </p>

        <div className="mt-10 grid gap-10 rounded-lg border border-slate-200 bg-white p-6 md:p-10">
          <section className={sectionClassName}>
            <h2 className={headingClassName}>1. Назначение материалов</h2>
            <p className={paragraphClassName}>
              ZaimKarta помогает читателю сопоставить предложения
              микрофинансовых организаций и понять основные параметры займа.
              Материалы создаются для информационной поддержки и повышения
              финансовой грамотности, а не для замены индивидуальной консультации.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>2. Источники и проверка</h2>
            <p className={paragraphClassName}>
              При подготовке карточек, подборок и статей редакция стремится
              использовать первичные и проверяемые источники:
            </p>
            <ul className={listClassName}>
              <li>официальные сайты и документы финансовых организаций;</li>
              <li>государственные реестры и публикации Банка России;</li>
              <li>тексты договоров, тарифы и правила предоставления продукта;</li>
              <li>нормативные акты и разъяснения государственных органов.</li>
            </ul>
            <p className={paragraphClassName}>
              Существенные условия по возможности сверяются между несколькими
              разделами источника. Если точное значение зависит от анкеты или
              решения кредитора, это указывается в материале.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>3. Что проверяется в предложениях</h2>
            <ul className={listClassName}>
              <li>диапазон суммы и срока;</li>
              <li>дневная ставка и полная стоимость займа;</li>
              <li>условия льготного или беспроцентного периода;</li>
              <li>требования к заёмщику и ограничения по регионам;</li>
              <li>способы получения и возврата денег;</li>
              <li>комиссии, дополнительные услуги и существенные риски.</li>
            </ul>
            <p className={paragraphClassName}>
              Дата проверки условий может отображаться на странице предложения.
              Пользователь всегда должен повторно проверить параметры на сайте
              кредитора непосредственно перед оформлением.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>4. Понятность и нейтральность</h2>
            <p className={paragraphClassName}>
              Редакция использует понятный язык, отделяет факты от оценочных
              суждений и не обещает одобрение. Формулировки не должны создавать
              ложное ощущение гарантированного результата, бесплатности или
              отсутствия финансового риска.
            </p>
            <p className={paragraphClassName}>
              Преимущества предложения рассматриваются вместе с ограничениями,
              стоимостью и возможными последствиями просрочки. Редакция не
              скрывает существенные условия ради увеличения числа переходов.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>5. Коммерческое раскрытие</h2>
            <p className={paragraphClassName}>
              ZaimKarta может получать вознаграждение от партнёров за переходы
              пользователей или оформленные продукты. Коммерческие договорённости
              могут влиять на наличие, порядок и заметность предложений.
            </p>
            <p className={paragraphClassName}>
              Вознаграждение не означает одобрение займа и не меняет договор между
              пользователем и кредитором. Справочные материалы и предупреждения не
              должны удаляться только потому, что они неудобны партнёру.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>6. Обновления и исправления</h2>
            <p className={paragraphClassName}>
              Условия финансовых продуктов меняются. ZaimKarta обновляет сведения
              при плановой проверке, получении подтверждённой информации или
              обнаружении ошибки. Существенная ошибка исправляется без ожидания
              следующего планового обновления.
            </p>
            <p className={paragraphClassName}>
              Сообщить о неточности можно по адресу{" "}
              <a
                href="mailto:zabota@zaimkarta.ru"
                className="font-semibold text-emerald-700 underline"
              >
                zabota@zaimkarta.ru
              </a>
              . В письме желательно указать адрес страницы, спорный фрагмент и
              ссылку на подтверждающий источник.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>7. Ответственность читателя</h2>
            <p className={paragraphClassName}>
              Решение о подаче заявки и заключении договора пользователь принимает
              самостоятельно. Перед оформлением важно оценить возможность возврата
              долга, проверить полную стоимость займа и прочитать договор.
            </p>
            <p className={paragraphClassName}>
              Дополнительные ограничения и условия сервиса приведены в{" "}
              <Link href="/rules" className="font-semibold text-emerald-700 underline">
                Правилах использования
              </Link>
              .
            </p>
          </section>
        </div>
      </article>
      <SiteFooter />
    </main>
  );
}
