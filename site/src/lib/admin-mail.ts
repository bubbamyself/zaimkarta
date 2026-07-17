import "server-only";

import { ImapFlow, type ListResponse, type MessageAddressObject } from "imapflow";
import { simpleParser } from "mailparser";
import nodemailer from "nodemailer";
import MailComposer from "nodemailer/lib/mail-composer";

const MAIL_PAGE_SIZE = 25;
const MAX_MESSAGE_BYTES = 5 * 1024 * 1024;
const MAX_BODY_CHARACTERS = 100_000;
const MAIL_CONNECTION_TIMEOUT_MS = 12_000;
const MAIL_SOCKET_TIMEOUT_MS = 25_000;

export const ADMIN_MAIL_FOLDERS = ["inbox", "sent", "junk", "trash"] as const;

export type AdminMailFolder = (typeof ADMIN_MAIL_FOLDERS)[number];

export type AdminMailFolderSummary = {
  key: AdminMailFolder;
  label: string;
  messages: number;
  unseen: number;
};

export type AdminMailListItem = {
  uid: number;
  subject: string;
  correspondent: string;
  date: string | null;
  seen: boolean;
  size: number;
};

export type AdminMailDetail = {
  uid: number;
  subject: string;
  from: string;
  to: string;
  replyToAddress: string | null;
  date: string | null;
  text: string;
  messageId: string | null;
  references: string[];
  attachmentsCount: number;
  bodyAvailable: boolean;
};

export type AdminMailPage = {
  account: string;
  selectedFolder: AdminMailFolder;
  folders: AdminMailFolderSummary[];
  messages: AdminMailListItem[];
  detail: AdminMailDetail | null;
};

type AdminMailConfig = {
  user: string;
  password: string;
  fromName: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
};

type ResolvedMailbox = {
  key: AdminMailFolder;
  label: string;
  path: string;
  messages: number;
  unseen: number;
};

type SendMessageInput = {
  to: string;
  subject: string;
  text: string;
  inReplyTo?: string;
  references?: string[];
};

class AdminMailError extends Error {
  constructor(
    readonly code:
      | "configuration"
      | "connection"
      | "invalid-input"
      | "message-not-found"
      | "message-too-large"
      | "operation-failed",
    message: string,
  ) {
    super(message);
    this.name = "AdminMailError";
  }
}

const FOLDER_DEFINITIONS: Record<
  AdminMailFolder,
  { label: string; specialUse?: string; fallbacks: string[] }
> = {
  inbox: {
    label: "Входящие",
    fallbacks: ["INBOX"],
  },
  sent: {
    label: "Отправленные",
    specialUse: "\\Sent",
    fallbacks: ["INBOX.Sent", "Sent", "Sent Messages"],
  },
  junk: {
    label: "Спам",
    specialUse: "\\Junk",
    fallbacks: ["INBOX.Junk", "Junk", "Spam"],
  },
  trash: {
    label: "Корзина",
    specialUse: "\\Trash",
    fallbacks: ["INBOX.Trash", "Trash", "Deleted Messages"],
  },
};

function readRequiredEnv(name: "ZAIMKARTA_MAIL_USER" | "ZAIMKARTA_MAIL_PASSWORD") {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new AdminMailError(
      "configuration",
      `Не задана серверная переменная ${name}.`,
    );
  }

  return value;
}

function readPort(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65_535
    ? parsed
    : fallback;
}

function getMailConfig(): AdminMailConfig {
  const user = readRequiredEnv("ZAIMKARTA_MAIL_USER");
  const password = readRequiredEnv("ZAIMKARTA_MAIL_PASSWORD");

  if (!/^\S+@\S+\.\S+$/.test(user)) {
    throw new AdminMailError(
      "configuration",
      "ZAIMKARTA_MAIL_USER должен содержать полный адрес почтового ящика.",
    );
  }

  return {
    user,
    password,
    fromName: process.env.ZAIMKARTA_MAIL_FROM_NAME?.trim() || "Забота ZaimKarta",
    imapHost: process.env.ZAIMKARTA_MAIL_IMAP_HOST?.trim() || "imap.beget.com",
    imapPort: readPort(process.env.ZAIMKARTA_MAIL_IMAP_PORT, 993),
    smtpHost: process.env.ZAIMKARTA_MAIL_SMTP_HOST?.trim() || "smtp.beget.com",
    smtpPort: readPort(process.env.ZAIMKARTA_MAIL_SMTP_PORT, 465),
  };
}

function createImapClient(config: AdminMailConfig) {
  const client = new ImapFlow({
    host: config.imapHost,
    port: config.imapPort,
    secure: true,
    auth: {
      user: config.user,
      pass: config.password,
    },
    logger: false,
    disableAutoIdle: true,
    connectionTimeout: MAIL_CONNECTION_TIMEOUT_MS,
    greetingTimeout: MAIL_CONNECTION_TIMEOUT_MS,
    socketTimeout: MAIL_SOCKET_TIMEOUT_MS,
    maxLiteralSize: MAX_MESSAGE_BYTES + 512 * 1024,
    maxLineLength: 256 * 1024,
  });

  client.on("error", () => undefined);

  return client;
}

async function withImap<T>(
  config: AdminMailConfig,
  callback: (client: ImapFlow) => Promise<T>,
) {
  const client = createImapClient(config);
  let connected = false;

  try {
    await client.connect();
    connected = true;
    return await callback(client);
  } catch (error) {
    if (error instanceof AdminMailError) {
      throw error;
    }

    throw new AdminMailError(
      "connection",
      "Не удалось выполнить запрос к почтовому серверу Beget.",
    );
  } finally {
    if (connected && client.usable) {
      await client.logout().catch(() => client.close());
    } else {
      client.close();
    }
  }
}

function findMailbox(
  mailboxes: ListResponse[],
  key: AdminMailFolder,
): ListResponse | undefined {
  const definition = FOLDER_DEFINITIONS[key];

  if (key === "inbox") {
    return mailboxes.find((mailbox) => mailbox.path.toUpperCase() === "INBOX");
  }

  const bySpecialUse = definition.specialUse
    ? mailboxes.find((mailbox) => mailbox.specialUse === definition.specialUse)
    : undefined;

  if (bySpecialUse) {
    return bySpecialUse;
  }

  return mailboxes.find((mailbox) =>
    definition.fallbacks.some(
      (fallback) => mailbox.path.toLowerCase() === fallback.toLowerCase(),
    ),
  );
}

async function resolveMailboxes(client: ImapFlow): Promise<ResolvedMailbox[]> {
  const listed = await client.list({
    statusQuery: {
      messages: true,
      unseen: true,
    },
    specialUseHints: {
      sent: "INBOX.Sent",
      junk: "INBOX.Junk",
      trash: "INBOX.Trash",
      drafts: "INBOX.Drafts",
    },
  });

  return ADMIN_MAIL_FOLDERS.map((key) => {
    const mailbox = findMailbox(listed, key);

    return {
      key,
      label: FOLDER_DEFINITIONS[key].label,
      path: mailbox?.path ?? FOLDER_DEFINITIONS[key].fallbacks[0],
      messages: mailbox?.status?.messages ?? 0,
      unseen: mailbox?.status?.unseen ?? 0,
    };
  });
}

function formatAddresses(addresses: MessageAddressObject[] | undefined) {
  if (!addresses?.length) {
    return "—";
  }

  return addresses
    .map((item) => {
      const name = item.name?.trim();
      const address = item.address?.trim();

      if (name && address) return `${name} <${address}>`;
      return name || address || "—";
    })
    .join(", ");
}

function firstAddress(addresses: MessageAddressObject[] | undefined) {
  return addresses?.find((item) => item.address)?.address?.trim() || null;
}

function toIsoDate(value: Date | string | undefined) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeReferences(value: string | string[] | undefined) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value];
}

async function fetchMessageDetail(
  client: ImapFlow,
  uid: number,
): Promise<AdminMailDetail> {
  const metadata = await client.fetchOne(
    String(uid),
    {
      uid: true,
      envelope: true,
      size: true,
      internalDate: true,
    },
    { uid: true },
  );

  if (!metadata) {
    throw new AdminMailError("message-not-found", "Письмо не найдено.");
  }

  const envelope = metadata.envelope;
  const baseDetail = {
    uid: metadata.uid,
    subject: envelope?.subject?.trim() || "Без темы",
    from: formatAddresses(envelope?.from),
    to: formatAddresses(envelope?.to),
    replyToAddress: firstAddress(envelope?.replyTo) || firstAddress(envelope?.from),
    date: toIsoDate(envelope?.date || metadata.internalDate),
    messageId: envelope?.messageId?.trim() || null,
  };

  if ((metadata.size ?? 0) > MAX_MESSAGE_BYTES) {
    return {
      ...baseDetail,
      text: "Письмо слишком большое для просмотра в простой версии. Откройте его в веб-почте Beget.",
      references: [],
      attachmentsCount: 0,
      bodyAvailable: false,
    };
  }

  const message = await client.fetchOne(
    String(uid),
    {
      uid: true,
      source: true,
    },
    { uid: true },
  );

  if (message === false || !message.source) {
    throw new AdminMailError("message-not-found", "Не удалось загрузить письмо.");
  }

  const parsed = await simpleParser(message.source, {
    skipHtmlToText: true,
    skipTextToHtml: true,
  });
  const plainText = parsed.text?.trim();

  return {
    ...baseDetail,
    subject: parsed.subject?.trim() || baseDetail.subject,
    from: parsed.from?.text?.trim() || baseDetail.from,
    to: parsed.to
      ? Array.isArray(parsed.to)
        ? parsed.to.map((item) => item.text).join(", ")
        : parsed.to.text
      : baseDetail.to,
    replyToAddress:
      parsed.replyTo?.value.find((item) => item.address)?.address ||
      parsed.from?.value.find((item) => item.address)?.address ||
      baseDetail.replyToAddress,
    date: toIsoDate(parsed.date) || baseDetail.date,
    text: plainText
      ? plainText.slice(0, MAX_BODY_CHARACTERS)
      : "У письма нет обычной текстовой версии. Откройте его в веб-почте Beget.",
    messageId: parsed.messageId?.trim() || baseDetail.messageId,
    references: normalizeReferences(parsed.references),
    attachmentsCount: parsed.attachments.length,
    bodyAvailable: Boolean(plainText),
  };
}

function toFolderSummary(mailbox: ResolvedMailbox): AdminMailFolderSummary {
  return {
    key: mailbox.key,
    label: mailbox.label,
    messages: mailbox.messages,
    unseen: mailbox.unseen,
  };
}

export function readAdminMailFolder(value: string | null | undefined): AdminMailFolder {
  return ADMIN_MAIL_FOLDERS.includes(value as AdminMailFolder)
    ? (value as AdminMailFolder)
    : "inbox";
}

export async function getAdminMailPage({
  folder,
  detailUid,
}: {
  folder: AdminMailFolder;
  detailUid?: number;
}): Promise<AdminMailPage> {
  const config = getMailConfig();

  return withImap(config, async (client) => {
    const mailboxes = await resolveMailboxes(client);
    const selected = mailboxes.find((item) => item.key === folder) ?? mailboxes[0];
    const lock = await client.getMailboxLock(selected.path, {
      readOnly: true,
      acquireTimeout: 5_000,
    });

    try {
      const exists = client.mailbox ? client.mailbox.exists : 0;
      const messages: AdminMailListItem[] = [];

      if (exists > 0) {
        const start = Math.max(1, exists - MAIL_PAGE_SIZE + 1);

        for await (const message of client.fetch(`${start}:${exists}`, {
          uid: true,
          envelope: true,
          flags: true,
          internalDate: true,
          size: true,
        })) {
          const envelope = message.envelope;
          const correspondent =
            folder === "sent"
              ? formatAddresses(envelope?.to)
              : formatAddresses(envelope?.from);

          messages.push({
            uid: message.uid,
            subject: envelope?.subject?.trim() || "Без темы",
            correspondent,
            date: toIsoDate(envelope?.date || message.internalDate),
            seen: message.flags?.has("\\Seen") ?? false,
            size: message.size ?? 0,
          });
        }
      }

      const detail = detailUid ? await fetchMessageDetail(client, detailUid) : null;

      return {
        account: config.user,
        selectedFolder: folder,
        folders: mailboxes.map(toFolderSummary),
        messages: messages.sort((left, right) => right.uid - left.uid),
        detail,
      };
    } finally {
      lock.release();
    }
  });
}

function validateSingleRecipient(value: string) {
  const email = value.trim().toLowerCase();

  if (
    email.length > 254 ||
    !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)
  ) {
    throw new AdminMailError(
      "invalid-input",
      "Укажите один корректный адрес получателя.",
    );
  }

  return email;
}

function validateSubject(value: string) {
  const subject = value.trim();

  if (!subject || subject.length > 200 || /[\r\n]/.test(subject)) {
    throw new AdminMailError(
      "invalid-input",
      "Тема должна содержать от 1 до 200 символов.",
    );
  }

  return subject;
}

function validateBody(value: string) {
  const text = value.trim();

  if (!text || text.length > 20_000) {
    throw new AdminMailError(
      "invalid-input",
      "Текст письма должен содержать от 1 до 20 000 символов.",
    );
  }

  return text;
}

async function composeRawMessage(config: AdminMailConfig, input: SendMessageInput) {
  const composer = new MailComposer({
    from: {
      name: config.fromName,
      address: config.user,
    },
    to: input.to,
    subject: input.subject,
    text: input.text,
    inReplyTo: input.inReplyTo,
    references: input.references,
    disableFileAccess: true,
    disableUrlAccess: true,
  });

  return composer.compile().build();
}

async function appendSentCopy(config: AdminMailConfig, raw: Buffer) {
  return withImap(config, async (client) => {
    const mailboxes = await resolveMailboxes(client);
    const sent = mailboxes.find((item) => item.key === "sent");

    if (!sent) return false;
    return Boolean(await client.append(sent.path, raw, ["\\Seen"], new Date()));
  });
}

async function sendRawMessage(
  config: AdminMailConfig,
  to: string,
  raw: Buffer,
) {
  const transport = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: true,
    auth: {
      user: config.user,
      pass: config.password,
    },
    connectionTimeout: MAIL_CONNECTION_TIMEOUT_MS,
    greetingTimeout: MAIL_CONNECTION_TIMEOUT_MS,
    socketTimeout: MAIL_SOCKET_TIMEOUT_MS,
    disableFileAccess: true,
    disableUrlAccess: true,
  });

  try {
    const result = await transport.sendMail({
      envelope: {
        from: config.user,
        to: [to],
      },
      raw,
      disableFileAccess: true,
      disableUrlAccess: true,
    });

    if (result.rejected.length > 0 || result.accepted.length === 0) {
      throw new AdminMailError(
        "operation-failed",
        "Почтовый сервер не принял письмо.",
      );
    }
  } catch (error) {
    if (error instanceof AdminMailError) throw error;
    throw new AdminMailError("connection", "Не удалось отправить письмо через Beget.");
  } finally {
    transport.close();
  }
}

export async function sendAdminMail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}) {
  const config = getMailConfig();
  const safeTo = validateSingleRecipient(to);
  const safeSubject = validateSubject(subject);
  const safeText = validateBody(text);
  const raw = await composeRawMessage(config, {
    to: safeTo,
    subject: safeSubject,
    text: safeText,
  });

  await sendRawMessage(config, safeTo, raw);

  try {
    return { sentCopySaved: await appendSentCopy(config, raw) };
  } catch {
    return { sentCopySaved: false };
  }
}

export async function replyToAdminMail({
  folder,
  uid,
  text,
}: {
  folder: AdminMailFolder;
  uid: number;
  text: string;
}) {
  const config = getMailConfig();
  const original = await getAdminMailPage({ folder, detailUid: uid });
  const detail = original.detail;

  if (!detail?.replyToAddress) {
    throw new AdminMailError(
      "invalid-input",
      "В исходном письме нет адреса для ответа.",
    );
  }

  const safeTo = validateSingleRecipient(detail.replyToAddress);
  const safeText = validateBody(text);
  const subject = detail.subject.toLowerCase().startsWith("re:")
    ? detail.subject
    : `Re: ${detail.subject}`;
  const references = [
    ...detail.references,
    ...(detail.messageId ? [detail.messageId] : []),
  ];
  const raw = await composeRawMessage(config, {
    to: safeTo,
    subject: validateSubject(subject.slice(0, 200)),
    text: safeText,
    inReplyTo: detail.messageId || undefined,
    references,
  });

  await sendRawMessage(config, safeTo, raw);

  try {
    return { sentCopySaved: await appendSentCopy(config, raw) };
  } catch {
    return { sentCopySaved: false };
  }
}

export async function moveAdminMail({
  sourceFolder,
  targetFolder,
  uid,
}: {
  sourceFolder: AdminMailFolder;
  targetFolder: "junk" | "trash";
  uid: number;
}) {
  if (!Number.isInteger(uid) || uid <= 0 || sourceFolder === targetFolder) {
    throw new AdminMailError("invalid-input", "Некорректная операция с письмом.");
  }

  const config = getMailConfig();

  return withImap(config, async (client) => {
    const mailboxes = await resolveMailboxes(client);
    const source = mailboxes.find((item) => item.key === sourceFolder);
    const target = mailboxes.find((item) => item.key === targetFolder);

    if (!source || !target) {
      throw new AdminMailError("operation-failed", "Почтовая папка не найдена.");
    }

    const lock = await client.getMailboxLock(source.path, {
      acquireTimeout: 5_000,
    });

    try {
      const moved = await client.messageMove(String(uid), target.path, { uid: true });

      if (!moved) {
        throw new AdminMailError("operation-failed", "Не удалось переместить письмо.");
      }
    } finally {
      lock.release();
    }
  });
}

export function getAdminMailErrorMessage(error: unknown) {
  if (error instanceof AdminMailError) {
    if (error.code === "configuration") {
      return "Почта ещё не подключена к админке. Добавьте серверные переменные ящика.";
    }

    return error.message;
  }

  return "Не удалось выполнить операцию с почтой. Попробуйте ещё раз.";
}
