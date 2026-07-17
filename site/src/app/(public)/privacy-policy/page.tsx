import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAbsoluteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Политика обработки персональных данных и cookies — ZaimKarta",
  description:
    "Как ZaimKarta обрабатывает технические данные, cookie, обращения и сведения о переходах к финансовым организациям.",
  alternates: {
    canonical: getAbsoluteUrl("/privacy-policy"),
  },
};

const sectionClassName = "grid gap-4";
const headingClassName = "text-2xl font-bold leading-tight text-slate-950";
const paragraphClassName = "leading-7 text-slate-700";
const listClassName = "grid list-disc gap-2 pl-5 leading-7 text-slate-700";

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <SiteHeader />
      <article className="mx-auto max-w-4xl px-5 py-10 md:py-14">
        <p className="text-sm font-semibold uppercase text-emerald-700">
          Документы
        </p>
        <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
          Политика обработки персональных данных и cookies
        </h1>
        <p className="mt-4 text-sm text-slate-500">
          Редакция от 18 июля 2026 года
        </p>

        <div className="mt-10 grid gap-10 rounded-lg border border-slate-200 bg-white p-6 md:p-10">
          <section className={sectionClassName}>
            <h2 className={headingClassName}>1. Общие положения</h2>
            <p className={paragraphClassName}>
              Настоящая Политика описывает обработку персональных данных при
              использовании сайта ZaimKarta.ru. Оператор персональных данных —
              ООО «ВР», ИНН 5503267433, КПП 550301001, юридический адрес:
              644046, г. Омск, ул. Куйбышева, д. 136, кв. 199.
            </p>
            <p className={paragraphClassName}>
              По вопросам обработки данных, их уточнения, удаления или отзыва
              согласия можно обратиться по адресу{" "}
              <a
                href="mailto:zabota@zaimkarta.ru"
                className="font-semibold text-emerald-700 underline"
              >
                zabota@zaimkarta.ru
              </a>
              .
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>2. Какие данные обрабатываются</h2>
            <ul className={listClassName}>
              <li>
                выбранный субъект Российской Федерации и cookie, сохраняющая
                этот выбор;
              </li>
              <li>
                технический идентификатор посетителя и перехода, дата и время
                перехода, страница, тип страницы, выбранное предложение и его
                позиция;
              </li>
              <li>
                IP-адрес в преобразованном хешированном виде, user-agent,
                referrer и UTM-метки, если они присутствуют в адресе;
              </li>
              <li>
                адрес электронной почты, имя, содержание сообщения и вложения,
                если пользователь сам направляет обращение на электронную почту;
              </li>
              <li>
                иные технические сведения, которые браузер передаёт серверу при
                обычном открытии веб-страниц.
              </li>
            </ul>
            <p className={paragraphClassName}>
              ZaimKarta не принимает заявки на займ и не запрашивает паспортные
              данные, сведения о доходах, банковской карте или кредитной истории.
              Такие сведения могут запрашиваться только на сайте выбранной
              финансовой организации, действующей как самостоятельный оператор.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>3. Цели обработки</h2>
            <ul className={listClassName}>
              <li>показ предложений с учётом региона регистрации;</li>
              <li>работа переходов на сайты финансовых организаций;</li>
              <li>защита от автоматических запросов и злоупотреблений;</li>
              <li>учёт переходов, партнёрская атрибуция и сверка статистики;</li>
              <li>улучшение структуры, содержания и работы сервиса;</li>
              <li>ответы на обращения и защита законных прав оператора.</li>
            </ul>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>4. Cookies и согласие пользователя</h2>
            <p className={paragraphClassName}>
              Cookie — небольшой фрагмент данных, который сайт сохраняет в
              браузере. В зависимости от сочетания с другими сведениями cookie и
              связанные с ней идентификаторы могут относиться к персональным
              данным. ZaimKarta использует следующие публичные cookie:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm text-slate-700">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-950">
                    <th className="px-3 py-3 font-bold">Название</th>
                    <th className="px-3 py-3 font-bold">Назначение</th>
                    <th className="px-3 py-3 font-bold">Срок</th>
                    <th className="px-3 py-3 font-bold">Когда создаётся</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-200 align-top">
                    <td className="px-3 py-3 font-mono text-xs">
                      zk_region_subject_code_v2
                    </td>
                    <td className="px-3 py-3">Запоминает выбранный регион.</td>
                    <td className="px-3 py-3">До 1 года</td>
                    <td className="px-3 py-3">
                      После подтверждения региона пользователем.
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200 align-top">
                    <td className="px-3 py-3 font-mono text-xs">zk_lead_id</td>
                    <td className="px-3 py-3">
                      Связывает переходы для партнёрской атрибуции, статистики и
                      защиты от злоупотреблений.
                    </td>
                    <td className="px-3 py-3">До 1 года</td>
                    <td className="px-3 py-3">
                      При переходе по кнопке оформления на сайт партнёра.
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200 align-top">
                    <td className="px-3 py-3 font-mono text-xs">
                      zk_cookie_notice_accepted
                    </td>
                    <td className="px-3 py-3">
                      Запоминает подтверждение уведомления об использовании
                      cookie.
                    </td>
                    <td className="px-3 py-3">До 1 года</td>
                    <td className="px-3 py-3">
                      После нажатия кнопки «OK» в уведомлении.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className={paragraphClassName}>
              Выбор региона и переход к партнёру являются действиями
              пользователя, инициирующими соответствующую обработку. Пользователь
              может отказаться от сохранения cookie, не совершая эти действия,
              удалить cookie в настройках браузера или ограничить их сохранение.
              После удаления регион потребуется выбрать повторно, а часть
              переходов и защитных механизмов может работать иначе.
            </p>
            <p className={paragraphClassName}>
              Отозвать согласие или запросить прекращение обработки можно письмом
              на zabota@zaimkarta.ru с темой «Персональные данные». Само удаление
              cookie выполняется пользователем в настройках браузера.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>5. Основания и способы обработки</h2>
            <p className={paragraphClassName}>
              Обработка выполняется с использованием средств автоматизации на
              основании согласия пользователя, действий по его запросу,
              требований законодательства, а также для осуществления прав и
              законных интересов оператора при условии, что права пользователя не
              нарушаются. Обработка включает сбор, запись, систематизацию,
              хранение, уточнение, использование, предоставление, блокирование,
              удаление и уничтожение данных.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>6. Передача третьим лицам</h2>
            <p className={paragraphClassName}>
              При нажатии кнопки перехода ZaimKarta передаёт выбранному партнёру
              технические идентификаторы посетителя и перехода, а также
              идентификатор предложения. Получатель зависит от выбранной
              финансовой организации и действующей партнёрской программы.
            </p>
            <p className={paragraphClassName}>
              Доступ к данным также может предоставляться организациям,
              обеспечивающим хостинг, работу базы данных и электронной почты, в
              объёме, необходимом для оказания соответствующих услуг. Передача
              может выполняться по требованию закона или государственного органа.
            </p>
            <p className={paragraphClassName}>
              После перехода на внешний сайт его владелец самостоятельно
              определяет цели и условия обработки данных. Перед передачей ему
              заявки следует ознакомиться с его политикой конфиденциальности.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>7. Сроки хранения</h2>
            <ul className={listClassName}>
              <li>cookie региона и идентификатора переходов — до 1 года;</li>
              <li>
                сведения о переходах и партнёрской атрибуции — до 3 лет с даты
                последнего связанного события;
              </li>
              <li>
                переписка по электронной почте — до 3 лет после завершения
                обращения;
              </li>
              <li>
                дольше указанных сроков — только когда это необходимо по закону,
                для рассмотрения спора или защиты прав оператора.
              </li>
            </ul>
            <p className={paragraphClassName}>
              После достижения цели данные удаляются, уничтожаются или
              обезличиваются, если отсутствуют иные законные основания для
              обработки.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>8. Права пользователя</h2>
            <p className={paragraphClassName}>Пользователь вправе:</p>
            <ul className={listClassName}>
              <li>получить сведения об обработке своих данных;</li>
              <li>потребовать уточнения, блокирования или удаления данных;</li>
              <li>отозвать согласие, если обработка основана на согласии;</li>
              <li>
                обжаловать действия оператора в Роскомнадзоре или в суде.
              </li>
            </ul>
            <p className={paragraphClassName}>
              Для идентификации данных в обращении желательно указать примерную
              дату перехода, страницу и технический идентификатор cookie, если он
              доступен. Оператор может запросить сведения, необходимые для
              подтверждения личности заявителя и предотвращения раскрытия данных
              другому лицу.
            </p>
          </section>

          <section className={sectionClassName}>
            <h2 className={headingClassName}>9. Защита и изменение Политики</h2>
            <p className={paragraphClassName}>
              Оператор применяет организационные и технические меры, направленные
              на предотвращение неправомерного доступа, изменения, раскрытия и
              уничтожения данных. Доступ предоставляется только в объёме,
              необходимом для выполнения рабочих обязанностей.
            </p>
            <p className={paragraphClassName}>
              Политика может обновляться при изменении сайта, состава данных или
              законодательства. Актуальная редакция всегда размещается по этому
              адресу. Дополнительные условия использования сервиса указаны в{" "}
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
