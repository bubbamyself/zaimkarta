"use server";

import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import {
  getAdminMailErrorMessage,
  moveAdminMail,
  readAdminMailFolder,
  replyToAdminMail,
  sendAdminMail,
} from "@/lib/admin-mail";
import { checkRateLimit } from "@/lib/rate-limit";

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readUid(formData: FormData, key: string) {
  const value = Number(readString(formData, key));
  return Number.isInteger(value) && value > 0 ? value : null;
}

async function requireMailOwner() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  if (session.role !== "BOSS") {
    throw new Error("Недостаточно прав для работы с почтой.");
  }

  return session;
}

function buildMailRedirect({
  folder = "inbox",
  notice,
  error,
}: {
  folder?: string;
  notice?: string;
  error?: string;
}) {
  const params = new URLSearchParams({
    section: "email",
    mailFolder: readAdminMailFolder(folder),
  });

  if (notice) params.set("mailNotice", notice);
  if (error) params.set("mailError", error);

  return `/admin?${params.toString()}`;
}

export async function sendAdminMailAction(formData: FormData) {
  const session = await requireMailOwner();
  const folder = readAdminMailFolder(readString(formData, "folder"));
  const rateLimit = checkRateLimit({
    key: `admin-mail-send:${session.id}`,
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    redirect(
      buildMailRedirect({
        folder,
        error: `Слишком много отправок. Повторите через ${rateLimit.retryAfterSeconds} сек.`,
      }),
    );
  }

  const replyUid = readUid(formData, "replyUid");
  let target: string;

  try {
    const result = replyUid
      ? await replyToAdminMail({
          folder,
          uid: replyUid,
          text: readString(formData, "text"),
        })
      : await sendAdminMail({
          to: readString(formData, "to"),
          subject: readString(formData, "subject"),
          text: readString(formData, "text"),
        });

    console.info("Admin mail sent", {
      adminId: session.id,
      adminUsername: session.username,
      kind: replyUid ? "reply" : "new",
      sentCopySaved: result.sentCopySaved,
    });

    target = buildMailRedirect({
      folder: "sent",
      notice: result.sentCopySaved
        ? "Письмо отправлено. Копия сохранена в «Отправленных»."
        : "Письмо отправлено, но сохранить копию в «Отправленных» не удалось.",
    });
  } catch (error) {
    target = buildMailRedirect({
      folder,
      error: getAdminMailErrorMessage(error),
    });
  }

  redirect(target);
}

export async function moveAdminMailAction(formData: FormData) {
  const session = await requireMailOwner();
  const sourceFolder = readAdminMailFolder(readString(formData, "folder"));
  const targetValue = readString(formData, "target");
  const targetFolder = targetValue === "junk" ? "junk" : "trash";
  const uid = readUid(formData, "uid");
  let target: string;

  if (!uid) {
    redirect(
      buildMailRedirect({
        folder: sourceFolder,
        error: "Не удалось определить письмо.",
      }),
    );
  }

  const rateLimit = checkRateLimit({
    key: `admin-mail-move:${session.id}`,
    limit: 30,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) {
    redirect(
      buildMailRedirect({
        folder: sourceFolder,
        error: "Слишком много операций. Подождите минуту.",
      }),
    );
  }

  try {
    await moveAdminMail({ sourceFolder, targetFolder, uid });

    console.info("Admin mail moved", {
      adminId: session.id,
      adminUsername: session.username,
      sourceFolder,
      targetFolder,
    });

    target = buildMailRedirect({
      folder: sourceFolder,
      notice: targetFolder === "junk" ? "Письмо перемещено в спам." : "Письмо перемещено в корзину.",
    });
  } catch (error) {
    target = buildMailRedirect({
      folder: sourceFolder,
      error: getAdminMailErrorMessage(error),
    });
  }

  redirect(target);
}
