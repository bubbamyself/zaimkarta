import Link from "next/link";
import {
  getAdminMailErrorMessage,
  getAdminMailPage,
  readAdminMailFolder,
  type AdminMailDetail,
  type AdminMailFolder,
} from "@/lib/admin-mail";
import { moveAdminMailAction, sendAdminMailAction } from "./email-actions";

type EmailSectionSearchParams = {
  mailFolder?: string;
  mailUid?: string;
  mailMode?: string;
  replyUid?: string;
  mailNotice?: string;
  mailError?: string;
};

function readUid(value: string | undefined) {
  const uid = Number(value);
  return Number.isInteger(uid) && uid > 0 ? uid : undefined;
}

function formatMailDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Omsk",
  }).format(date);
}

function formatSize(size: number) {
  if (size < 1024) return `${size} Б`;
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} КБ`;
  return `${(size / 1024 / 1024).toFixed(1)} МБ`;
}

function mailHref({
  folder,
  uid,
  mode,
  replyUid,
}: {
  folder: AdminMailFolder;
  uid?: number;
  mode?: "compose";
  replyUid?: number;
}) {
  const params = new URLSearchParams({
    section: "email",
    mailFolder: folder,
  });

  if (uid) params.set("mailUid", String(uid));
  if (mode) params.set("mailMode", mode);
  if (replyUid) params.set("replyUid", String(replyUid));

  return `/admin?${params.toString()}`;
}

function MailComposerForm({
  folder,
  reply,
}: {
  folder: AdminMailFolder;
  reply?: AdminMailDetail;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950">
            {reply ? `Ответ: ${reply.subject}` : "Новое письмо"}
          </h2>
          {reply ? (
            <p className="mt-1 text-sm text-slate-500">Кому: {reply.replyToAddress}</p>
          ) : null}
        </div>
        <Link
          href={mailHref({ folder })}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500"
        >
          Отмена
        </Link>
      </div>

      <form action={sendAdminMailAction} className="mt-5 grid gap-4">
        <input type="hidden" name="folder" value={folder} />
        {reply ? <input type="hidden" name="replyUid" value={reply.uid} /> : null}

        {!reply ? (
          <>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Кому</span>
              <input
                type="email"
                name="to"
                required
                maxLength={254}
                autoComplete="off"
                className="h-11 rounded-md border border-slate-300 px-3 outline-none focus:border-slate-600"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Тема</span>
              <input
                type="text"
                name="subject"
                required
                maxLength={200}
                className="h-11 rounded-md border border-slate-300 px-3 outline-none focus:border-slate-600"
              />
            </label>
          </>
        ) : null}

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-700">Текст письма</span>
          <textarea
            name="text"
            required
            maxLength={20_000}
            rows={10}
            className="rounded-md border border-slate-300 px-3 py-3 outline-none focus:border-slate-600"
          />
        </label>

        <div>
          <button className="rounded-md bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800">
            {reply ? "Отправить ответ" : "Отправить письмо"}
          </button>
        </div>
      </form>
    </section>
  );
}

function MessageActions({
  folder,
  detail,
}: {
  folder: AdminMailFolder;
  detail: AdminMailDetail;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {folder !== "sent" ? (
        <Link
          href={mailHref({ folder, replyUid: detail.uid })}
          className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
        >
          Ответить
        </Link>
      ) : null}
      {folder !== "junk" ? (
        <form action={moveAdminMailAction}>
          <input type="hidden" name="folder" value={folder} />
          <input type="hidden" name="uid" value={detail.uid} />
          <input type="hidden" name="target" value="junk" />
          <button className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-900 hover:bg-amber-100">
            В спам
          </button>
        </form>
      ) : null}
      {folder !== "trash" ? (
        <form action={moveAdminMailAction}>
          <input type="hidden" name="folder" value={folder} />
          <input type="hidden" name="uid" value={detail.uid} />
          <input type="hidden" name="target" value="trash" />
          <button className="rounded-md border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-800 hover:bg-rose-100">
            В корзину
          </button>
        </form>
      ) : null}
    </div>
  );
}

export async function AdminEmailSection({
  searchParams,
}: {
  searchParams: EmailSectionSearchParams;
}) {
  const folder = readAdminMailFolder(searchParams.mailFolder);
  const detailUid = readUid(searchParams.mailUid);
  const replyUid = readUid(searchParams.replyUid);
  const requestedUid = replyUid || detailUid;
  let page;

  try {
    page = await getAdminMailPage({ folder, detailUid: requestedUid });
  } catch (error) {
    return (
      <section className="rounded-xl border border-rose-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-950">Почта</h1>
        <p className="mt-3 text-sm text-rose-700">{getAdminMailErrorMessage(error)}</p>
        <p className="mt-3 text-sm text-slate-500">
          Раздел не показывает пароль и не хранит письма в базе ZaimKarta.
        </p>
      </section>
    );
  }

  if (searchParams.mailMode === "compose") {
    return <MailComposerForm folder={folder} />;
  }

  if (replyUid && page.detail) {
    return <MailComposerForm folder={folder} reply={page.detail} />;
  }

  return (
    <section className="grid gap-5">
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Почта</h1>
          <p className="mt-1 text-sm text-slate-500">{page.account}</p>
        </div>
        <Link
          href={mailHref({ folder, mode: "compose" })}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800"
        >
          Написать письмо
        </Link>
      </div>

      {searchParams.mailNotice ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {searchParams.mailNotice}
        </p>
      ) : null}
      {searchParams.mailError ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {searchParams.mailError}
        </p>
      ) : null}

      <nav className="flex gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        {page.folders.map((item) => {
          const active = item.key === folder;
          return (
            <Link
              key={item.key}
              href={mailHref({ folder: item.key })}
              className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-semibold ${
                active
                  ? "bg-slate-950 text-white"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {item.label} ({item.messages})
              {item.unseen > 0 ? ` · ${item.unseen} новых` : ""}
            </Link>
          );
        })}
      </nav>

      {page.detail ? (
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start">
            <div className="min-w-0">
              <Link
                href={mailHref({ folder })}
                className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
              >
                ← К списку
              </Link>
              <h2 className="mt-3 break-words text-2xl font-bold text-slate-950">
                {page.detail.subject}
              </h2>
              <dl className="mt-3 grid gap-1 text-sm text-slate-600">
                <div><dt className="inline font-semibold">От:</dt> <dd className="inline">{page.detail.from}</dd></div>
                <div><dt className="inline font-semibold">Кому:</dt> <dd className="inline">{page.detail.to}</dd></div>
                <div><dt className="inline font-semibold">Дата:</dt> <dd className="inline">{formatMailDate(page.detail.date)}</dd></div>
              </dl>
            </div>
            <MessageActions folder={folder} detail={page.detail} />
          </div>

          {page.detail.attachmentsCount > 0 ? (
            <p className="mt-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">
              В письме есть вложения: {page.detail.attachmentsCount}. В простой версии они открываются через Beget Webmail.
            </p>
          ) : null}

          <pre className="mt-5 max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-5 font-sans text-sm leading-6 text-slate-800">
            {page.detail.text}
          </pre>
        </article>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {page.messages.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {page.messages.map((message) => (
                <Link
                  key={message.uid}
                  href={mailHref({ folder, uid: message.uid })}
                  className={`grid gap-2 px-5 py-4 hover:bg-slate-50 lg:grid-cols-[minmax(180px,0.7fr)_minmax(240px,1.5fr)_150px] lg:items-center ${
                    message.seen ? "bg-white" : "bg-emerald-50/50"
                  }`}
                >
                  <p className={`truncate text-sm ${message.seen ? "text-slate-700" : "font-bold text-slate-950"}`}>
                    {message.correspondent}
                  </p>
                  <div className="min-w-0">
                    <p className={`truncate text-sm ${message.seen ? "font-medium text-slate-800" : "font-bold text-slate-950"}`}>
                      {message.subject}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{formatSize(message.size)}</p>
                  </div>
                  <p className="text-xs text-slate-500 lg:text-right">{formatMailDate(message.date)}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="p-8 text-center text-sm text-slate-500">В этой папке пока нет писем.</p>
          )}
        </div>
      )}
    </section>
  );
}
