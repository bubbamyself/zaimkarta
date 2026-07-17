import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAbsoluteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Правила использования ZaimKarta",
  description:
    "Условия использования информационного сервиса ZaimKarta и переходов на сайты финансовых организаций.",
  alternates: {
    canonical: getAbsoluteUrl("/rules"),
  },
};

const sectionClassName = "grid gap-4";
const headingClassName = "text-2xl font-bold leading-tight text-slate-950";
const paragraphClassName = "leading-7 text-slate-700";
const listClassName = "grid list-disc gap-2 pl-5 leading-7 text-slate-700";

export default function RulesPage() {
  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <SiteHeader />
      <article className="mx-auto max-w-4xl px-5 py-10 md:py-14">
        <p className="text-sm font-semibold uppercase text-emerald-700">
          Документы
        </p>
        <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
          Правила использования ZaimKarta
        </h1>
        <p className="mt-4 text-sm text-slate-500">
          Редакция от 18 июля 2026 года
        </p>

        <div className="mt-10 grid gap-10 rounded-lg border border-slate-200 bg-white p-6 md:p-10">
          <section className={sectionClassName}>
            <h2 className={headingClassName}>1. О сервисе</h2>
            <p className={paragraphClassName}>
              ZaimKarta.ru — информационный сервис ООО «ВР», ИНН 5503267433,
              КПП 550301001. Сервис помогает сравнивать опубликованные условия
              предложений микрофинансовых и иных финансовых организаций.
            </p>
            <p className={paragraphClassName}>
              ZaimKarta не является банком, микрофинансовой организацией,
              кредитором, финансовым консультантом или представителем
              пользователя. Сервис не выдаёт займы, не принимает заявки и не
              принимает решения об одобрении.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>2. Использование информации</h2>
            <p className={paragraphClassName}>
              Материалы сайта носят справочный характер и не являются
              индивидуальной финансовой рекомендацией, гарантией одобрения или
              публичной офертой финансовой организации.
            </p>
            <p className={paragraphClassName}>
              Перед оформлением пользователь самостоятельно проверяет на сайте
              кредитора полную стоимость займа, ставку, срок, комиссии,
              дополнительные услуги, требования к заёмщику и условия договора.
              При расхождении приоритет имеют документы и сведения кредитора.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>3. Переходы к партнёрам</h2>
            <p className={paragraphClassName}>
              Кнопка оформления ведёт на внешний сайт партнёра или финансовой
              организации. Дальнейшие отношения возникают непосредственно между
              пользователем и владельцем внешнего сайта. ZaimKarta не получает
              данные заявки, которые пользователь вводит на стороне кредитора.
            </p>
            <p className={paragraphClassName}>
              ZaimKarta может получать вознаграждение за переход или оформленный
              продукт. Это может влиять на состав, порядок и заметность
              предложений, но не изменяет условия договора кредитора и не
              гарантирует одобрение.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>4. Обязанности пользователя</h2>
            <p className={paragraphClassName}>Пользователь обязуется:</p>
            <ul className={listClassName}>
              <li>использовать сайт законным способом;</li>
              <li>
                не пытаться нарушить работу сайта, обойти ограничения или
                получить доступ к закрытым разделам;
              </li>
              <li>
                не применять автоматические средства для массового копирования,
                перегрузки или имитации переходов;
              </li>
              <li>
                самостоятельно оценивать финансовую нагрузку и содержание
                договора перед его заключением.
              </li>
            </ul>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>5. Контент и интеллектуальные права</h2>
            <p className={paragraphClassName}>
              Тексты, структура, дизайн, программный код и оригинальные материалы
              ZaimKarta защищаются законодательством. Разрешается цитирование в
              объёме, оправданном информационной целью, с указанием источника и
              активной ссылкой. Массовое копирование и коммерческое переиздание
              без разрешения правообладателя не допускаются.
            </p>
            <p className={paragraphClassName}>
              Товарные знаки, логотипы и наименования финансовых организаций
              принадлежат соответствующим правообладателям и используются для
              идентификации предложений.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>6. Доступность и ответственность</h2>
            <p className={paragraphClassName}>
              Оператор старается поддерживать точность и доступность сайта, но не
              гарантирует непрерывную работу, отсутствие технических ошибок и
              неизменность внешних предложений. Сайт может временно ограничивать
              доступ для обслуживания, безопасности или исполнения требований
              закона.
            </p>
            <p className={paragraphClassName}>
              Оператор не отвечает за решения кредитора, отказ в заявке, действия
              внешнего сайта или последствия договора, заключённого пользователем
              с третьим лицом. Это не ограничивает ответственность оператора в
              случаях, когда такое ограничение запрещено законом.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>7. Персональные данные</h2>
            <p className={paragraphClassName}>
              Обработка технических данных, cookie и обращений описана в{" "}
              <Link
                href="/privacy-policy"
                className="font-semibold text-emerald-700 underline"
              >
                Политике обработки персональных данных и cookies
              </Link>
              . Используя выбор региона, переходы к партнёрам или электронную
              почту, пользователь инициирует обработку, необходимую для выбранного
              действия.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>8. Изменения и обратная связь</h2>
            <p className={paragraphClassName}>
              Актуальная редакция Правил размещается на этой странице. Продолжая
              пользоваться сайтом после публикации изменений, пользователь
              принимает обновлённые условия в части дальнейшего использования.
            </p>
            <p className={paragraphClassName}>
              Сообщить об ошибке, нарушении прав или задать вопрос можно по адресу{" "}
              <a
                href="mailto:zabota@zaimkarta.ru"
                className="font-semibold text-emerald-700 underline"
              >
                zabota@zaimkarta.ru
              </a>
              . Принципы подготовки материалов изложены в{" "}
              <Link
                href="/editorial-guidelines"
                className="font-semibold text-emerald-700 underline"
              >
                Редакционной политике
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
