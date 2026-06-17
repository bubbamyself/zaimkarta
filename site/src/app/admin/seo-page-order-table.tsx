"use client";

import type { SeoPageType } from "@prisma/client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { updateSeoPageDisplayOrder } from "./seo-actions";

export type SeoPageOrderRow = {
  id: string;
  h1: string;
  slug: string;
  pageType: SeoPageType;
  statusLabel: string;
  statusClassName: string;
  displayPriority: number;
  offersCount: number;
  toolsCount: number;
  faqCount: number;
  clicks: number | null;
  updatedAtLabel: string;
};

type SeoPageOrderTableProps = {
  canManageSeo: boolean;
  pages: SeoPageOrderRow[];
  pageType: SeoPageType;
};

function moveItem(items: SeoPageOrderRow[], draggedId: string, targetId: string) {
  const draggedIndex = items.findIndex((item) => item.id === draggedId);
  const targetIndex = items.findIndex((item) => item.id === targetId);

  if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
    return items;
  }

  const nextItems = [...items];
  const [draggedItem] = nextItems.splice(draggedIndex, 1);
  nextItems.splice(targetIndex, 0, draggedItem);

  return nextItems;
}

export function SeoPageOrderTable({
  canManageSeo,
  pages,
  pageType,
}: SeoPageOrderTableProps) {
  const [rows, setRows] = useState(pages);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function saveOrder(nextRows: SeoPageOrderRow[]) {
    startTransition(async () => {
      await updateSeoPageDisplayOrder(
        pageType,
        nextRows.map((row) => row.id),
      );
    });
  }

  function handleDrop(targetId: string) {
    if (!draggedId) {
      return;
    }

    const nextRows = moveItem(rows, draggedId, targetId);
    setDraggedId(null);

    if (nextRows !== rows) {
      setRows(nextRows);
      saveOrder(nextRows);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="px-5 py-8 text-center text-sm text-slate-500">
        По выбранным фильтрам страниц нет
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1160px] border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            <th className="w-12 px-5 py-3 font-semibold">
              <span className="sr-only">Порядок</span>
            </th>
            <th className="px-5 py-3 font-semibold">Место</th>
            <th className="px-5 py-3 font-semibold">Страница</th>
            <th className="px-5 py-3 font-semibold">Статус</th>
            <th className="px-5 py-3 font-semibold">Офферы</th>
            <th className="px-5 py-3 font-semibold">Инструменты</th>
            <th className="px-5 py-3 font-semibold">FAQ</th>
            <th className="px-5 py-3 font-semibold">Клики</th>
            <th className="px-5 py-3 font-semibold">Обновлено</th>
            <th className="px-5 py-3 font-semibold">Правка</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((page, index) => {
            const isDragging = draggedId === page.id;

            return (
              <tr
                key={page.id}
                onDragOver={(event) => {
                  if (canManageSeo) {
                    event.preventDefault();
                  }
                }}
                onDrop={() => handleDrop(page.id)}
                className={isDragging ? "bg-slate-50 opacity-60" : "bg-white"}
              >
                <td className="px-5 py-4">
                  {canManageSeo ? (
                    <button
                      type="button"
                      draggable
                      onDragStart={() => setDraggedId(page.id)}
                      onDragEnd={() => setDraggedId(null)}
                      className="grid h-8 w-8 cursor-grab place-items-center rounded-md text-slate-300 transition hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing"
                      aria-label={`Перетащить ${page.h1}`}
                      title="Перетащить SEO-страницу"
                    >
                      <span className="grid gap-1">
                        <span className="block h-0.5 w-4 rounded-full bg-current" />
                        <span className="block h-0.5 w-4 rounded-full bg-current" />
                        <span className="block h-0.5 w-4 rounded-full bg-current" />
                      </span>
                    </button>
                  ) : null}
                </td>
                <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-950">
                  {isPending ? "сохраняю" : index + 1}
                </td>
                <td className="px-5 py-4">
                  <p className="font-semibold text-slate-950">{page.h1}</p>
                  <p className="mt-1 text-slate-500">/{page.slug}</p>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-md px-2 py-1 text-xs font-semibold ${page.statusClassName}`}
                  >
                    {page.statusLabel}
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-700">{page.offersCount}</td>
                <td className="px-5 py-4 text-slate-700">{page.toolsCount}</td>
                <td className="px-5 py-4 text-slate-700">{page.faqCount}</td>
                <td className="px-5 py-4 text-slate-700">
                  {page.clicks ?? "—"}
                </td>
                <td className="px-5 py-4 text-slate-700">
                  {page.updatedAtLabel}
                </td>
                <td className="px-5 py-4">
                  <Link
                    href={`/admin/seo/${page.id}`}
                    className="font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    редактировать
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
