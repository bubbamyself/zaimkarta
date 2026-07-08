"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { updateOfferDisplayOrder } from "./offer-actions";

export type OfferOrderRow = {
  id: string;
  brandName: string;
  slug: string;
  networkLabel: string;
  networkOfferId: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED" | "DRAFT";
  statusLabel: string;
  statusClassName: string;
  displayPriority: number;
  amountLabel: string;
  conditionsCheckedAtLabel: string;
  restrictedRegionCodes: string[];
  clicks: number;
};

type OfferOrderTableProps = {
  canManageOffers: boolean;
  offers: OfferOrderRow[];
};

function moveItem(items: OfferOrderRow[], draggedId: string, targetId: string) {
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

export function OfferOrderTable({
  canManageOffers,
  offers,
}: OfferOrderTableProps) {
  const [rows, setRows] = useState(offers);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function saveOrder(nextRows: OfferOrderRow[]) {
    startTransition(async () => {
      await updateOfferDisplayOrder(nextRows.map((row) => row.id));
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
        Офферов в работе пока нет
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1220px] border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            <th className="w-12 px-5 py-3 font-semibold">
              <span className="sr-only">Порядок</span>
            </th>
            <th className="px-5 py-3 font-semibold">Место</th>
            <th className="px-5 py-3 font-semibold">Бренд</th>
            <th className="px-5 py-3 font-semibold">Идентификаторы</th>
            <th className="px-5 py-3 font-semibold">Статус</th>
            <th className="px-5 py-3 font-semibold">Приоритет</th>
            <th className="px-5 py-3 font-semibold">Сумма</th>
            <th className="px-5 py-3 font-semibold">Регионы</th>
            <th className="px-5 py-3 font-semibold">Проверено</th>
            <th className="px-5 py-3 font-semibold">Клики</th>
            <th className="px-5 py-3 font-semibold">Страница</th>
            {canManageOffers ? (
              <th className="px-5 py-3 font-semibold">Правка</th>
            ) : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((offer, index) => {
            const isDragging = draggedId === offer.id;

            return (
              <tr
                key={offer.id}
                onDragOver={(event) => {
                  if (canManageOffers) {
                    event.preventDefault();
                  }
                }}
                onDrop={() => handleDrop(offer.id)}
                className={isDragging ? "bg-slate-50 opacity-60" : "bg-white"}
              >
                <td className="px-5 py-4">
                  {canManageOffers ? (
                    <button
                      type="button"
                      draggable
                      onDragStart={() => setDraggedId(offer.id)}
                      onDragEnd={() => setDraggedId(null)}
                      className="grid h-8 w-8 cursor-grab place-items-center rounded-md text-slate-300 transition hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing"
                      aria-label={`Перетащить ${offer.brandName}`}
                      title="Перетащить оффер"
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
                  {index + 1}
                </td>
                <td className="px-5 py-4 font-semibold text-slate-950">
                  {offer.brandName}
                </td>
                <td className="px-5 py-4 text-xs text-slate-600">
                  <div className="grid gap-1">
                    <span>slug: {offer.slug}</span>
                    <span>сеть: {offer.networkLabel}</span>
                    <span>offer ID: {offer.networkOfferId}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-slate-700">
                  <span
                    className={`rounded-md px-2 py-1 text-xs font-semibold ${offer.statusClassName}`}
                  >
                    {offer.statusLabel}
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-700">
                  {isPending ? "сохраняю" : index + 1}
                </td>
                <td className="px-5 py-4 text-slate-700">{offer.amountLabel}</td>
                <td className="px-5 py-4 text-slate-700">
                  {offer.restrictedRegionCodes.length > 0
                    ? `Стоп-регионы: ${offer.restrictedRegionCodes.join(", ")}`
                    : "без ограничений"}
                </td>
                <td className="px-5 py-4 text-slate-700">
                  {offer.conditionsCheckedAtLabel}
                </td>
                <td className="px-5 py-4 font-semibold text-slate-950">
                  {offer.clicks}
                </td>
                <td className="px-5 py-4">
                  <Link
                    href={`/offers/${offer.slug}`}
                    className={`font-semibold ${
                      offer.status === "ACTIVE"
                        ? "text-emerald-700 hover:text-emerald-800"
                        : "pointer-events-none text-slate-400"
                    }`}
                  >
                    {offer.status === "ACTIVE" ? "открыть" : "скрыта"}
                  </Link>
                </td>
                {canManageOffers ? (
                  <td className="px-5 py-4">
                    <Link
                      href={`/admin/offers/${offer.id}`}
                      className="font-semibold text-emerald-700 hover:text-emerald-800"
                    >
                      редактировать
                    </Link>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
