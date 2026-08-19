"use client";

import { useMemo, useState } from "react";

type JsonRecord = Record<string, unknown>;

type RelatedPageOption = {
  slug: string;
  pageType: "CATEGORY" | "ARTICLE" | "SERVICE";
  label: string;
};

type EditorLink = {
  text?: string;
  href?: string;
};

type EditorBlock = JsonRecord & {
  id?: string;
  type?: string;
  text?: string;
  title?: string;
  level?: number;
  items?: string[];
  links?: EditorLink[];
  tone?: "info" | "warning" | "success";
};

type CategoryContentBlocksEditorProps = {
  initialBlocks: unknown;
  relatedPages: RelatedPageOption[];
};

const EDITABLE_BLOCK_TYPES = new Set([
  "heading",
  "paragraph",
  "list",
  "callout",
  "links",
]);

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeBlocks(value: unknown): EditorBlock[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord).map((block, index) => ({
    ...block,
    id: String(block.id ?? `saved-block-${index + 1}`),
  }));
}

function createBlock(type: string): EditorBlock {
  const id = `editor-${type}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;

  if (type === "heading") {
    return { id, type, level: 2, text: "" };
  }

  if (type === "list") {
    return { id, type, title: "", items: [""] };
  }

  if (type === "callout") {
    return { id, type, tone: "info", title: "", text: "" };
  }

  if (type === "links") {
    return {
      id,
      type,
      title: "Полезные материалы и инструменты",
      links: [{ text: "", href: "" }],
    };
  }

  return { id, type: "paragraph", text: "" };
}

function blockLabel(type?: string) {
  if (type === "heading") return "Заголовок";
  if (type === "paragraph") return "Текст";
  if (type === "list") return "Список";
  if (type === "callout") return "Важная заметка";
  if (type === "links") return "Полезные материалы";
  return "Технический блок";
}

function pageTypeLabel(pageType: RelatedPageOption["pageType"]) {
  if (pageType === "ARTICLE") return "Статья";
  if (pageType === "SERVICE") return "Инструмент";
  return "Подборка";
}

function serializeBlocks(blocks: EditorBlock[]) {
  return JSON.stringify(
    blocks.map((block) => {
      if (block.type === "list") {
        return {
          ...block,
          title: block.title?.trim() || undefined,
          items: (block.items ?? []).map((item) => item.trim()).filter(Boolean),
        };
      }

      if (block.type === "links") {
        return {
          ...block,
          title: block.title?.trim() || undefined,
          links: (block.links ?? [])
            .map((link) => ({
              text: link.text?.trim() ?? "",
              href: link.href?.trim() ?? "",
            }))
            .filter((link) => link.text && link.href),
        };
      }

      return block;
    }),
  );
}

const inputClassName =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";
const textareaClassName =
  "w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

export function CategoryContentBlocksEditor({
  initialBlocks,
  relatedPages,
}: CategoryContentBlocksEditorProps) {
  const [blocks, setBlocks] = useState(() => normalizeBlocks(initialBlocks));
  const serializedBlocks = useMemo(() => serializeBlocks(blocks), [blocks]);

  function updateBlock(index: number, patch: Partial<EditorBlock>) {
    setBlocks((current) =>
      current.map((block, blockIndex) =>
        blockIndex === index ? { ...block, ...patch } : block,
      ),
    );
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= blocks.length) {
      return;
    }

    setBlocks((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function removeBlock(index: number) {
    setBlocks((current) => current.filter((_, blockIndex) => blockIndex !== index));
  }

  function updateLink(
    blockIndex: number,
    linkIndex: number,
    patch: Partial<EditorLink>,
  ) {
    const block = blocks[blockIndex];
    const links = [...(block.links ?? [])];
    links[linkIndex] = { ...links[linkIndex], ...patch };
    updateBlock(blockIndex, { links });
  }

  return (
    <section className="overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-sm">
      <input type="hidden" name="contentBlocks" value={serializedBlocks} />

      <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-sky-50 px-5 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-lg font-bold text-slate-950">
                Содержание под карточками
              </h4>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                {blocks.length} {blocks.length === 1 ? "блок" : "блоков"}
              </span>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Здесь редактируется SEO-текст после офферов. Блоки появятся на
              странице в том же порядке. Код и JSON заполнять не нужно.
            </p>
          </div>
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-900 lg:max-w-xs">
            Микроразметка подборки и список офферов создаются автоматически из
            заполненных данных.
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:p-5">
        {blocks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
            <p className="font-semibold text-slate-800">Пока нет блоков</p>
            <p className="mt-1 text-sm text-slate-500">
              Добавьте заголовок и текст — они появятся под карточками офферов.
            </p>
          </div>
        ) : null}

        {blocks.map((block, index) => {
          const editable = EDITABLE_BLOCK_TYPES.has(block.type ?? "");

          return (
            <article
              key={block.id ?? index}
              className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-bold text-slate-900">
                      {blockLabel(block.type)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {block.type === "links"
                        ? "Перелинковка со статьями, сервисами и подборками"
                        : "Отображается после карточек офферов"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => moveBlock(index, -1)}
                    disabled={index === 0}
                    aria-label={`Поднять блок ${index + 1}`}
                    className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBlock(index, 1)}
                    disabled={index === blocks.length - 1}
                    aria-label={`Опустить блок ${index + 1}`}
                    className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    ↓
                  </button>
                  {editable ? (
                    <button
                      type="button"
                      onClick={() => removeBlock(index)}
                      className="h-9 rounded-lg border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                    >
                      Удалить
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 p-4">
                {block.type === "heading" ? (
                  <div className="grid gap-4 md:grid-cols-[140px_minmax(0,1fr)]">
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-slate-700">
                        Уровень
                      </span>
                      <select
                        value={block.level === 3 ? 3 : 2}
                        onChange={(event) =>
                          updateBlock(index, { level: Number(event.target.value) })
                        }
                        className={inputClassName}
                      >
                        <option value="2">H2 — раздел</option>
                        <option value="3">H3 — подраздел</option>
                      </select>
                    </label>
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-slate-700">
                        Текст заголовка
                      </span>
                      <input
                        value={block.text ?? ""}
                        onChange={(event) =>
                          updateBlock(index, { text: event.target.value })
                        }
                        placeholder="Например: Как выбрать займ под 0%"
                        className={inputClassName}
                      />
                    </label>
                  </div>
                ) : null}

                {block.type === "paragraph" ? (
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-slate-700">
                      Текст абзаца
                    </span>
                    <textarea
                      value={block.text ?? ""}
                      onChange={(event) =>
                        updateBlock(index, { text: event.target.value })
                      }
                      rows={5}
                      placeholder="Напишите полезное объяснение для пользователя"
                      className={textareaClassName}
                    />
                  </label>
                ) : null}

                {block.type === "list" ? (
                  <>
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-slate-700">
                        Заголовок списка <span className="font-normal text-slate-400">(необязательно)</span>
                      </span>
                      <input
                        value={block.title ?? ""}
                        onChange={(event) =>
                          updateBlock(index, { title: event.target.value })
                        }
                        className={inputClassName}
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-slate-700">
                        Пункты — каждый с новой строки
                      </span>
                      <textarea
                        value={(block.items ?? []).join("\n")}
                        onChange={(event) =>
                          updateBlock(index, {
                            items: event.target.value.split("\n"),
                          })
                        }
                        rows={6}
                        className={textareaClassName}
                      />
                    </label>
                  </>
                ) : null}

                {block.type === "callout" ? (
                  <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
                    <label className="grid content-start gap-2">
                      <span className="text-sm font-semibold text-slate-700">
                        Оформление
                      </span>
                      <select
                        value={block.tone ?? "info"}
                        onChange={(event) =>
                          updateBlock(index, {
                            tone: event.target.value as EditorBlock["tone"],
                          })
                        }
                        className={inputClassName}
                      >
                        <option value="info">Нейтральное</option>
                        <option value="warning">Внимание</option>
                        <option value="success">Полезный совет</option>
                      </select>
                    </label>
                    <div className="grid gap-4">
                      <label className="grid gap-2">
                        <span className="text-sm font-semibold text-slate-700">
                          Заголовок заметки
                        </span>
                        <input
                          value={block.title ?? ""}
                          onChange={(event) =>
                            updateBlock(index, { title: event.target.value })
                          }
                          className={inputClassName}
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-sm font-semibold text-slate-700">
                          Текст заметки
                        </span>
                        <textarea
                          value={block.text ?? ""}
                          onChange={(event) =>
                            updateBlock(index, { text: event.target.value })
                          }
                          rows={4}
                          className={textareaClassName}
                        />
                      </label>
                    </div>
                  </div>
                ) : null}

                {block.type === "links" ? (
                  <>
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-slate-700">
                        Заголовок блока
                      </span>
                      <input
                        value={block.title ?? ""}
                        onChange={(event) =>
                          updateBlock(index, { title: event.target.value })
                        }
                        className={inputClassName}
                      />
                    </label>

                    <div className="grid gap-3">
                      {(block.links ?? []).map((link, linkIndex) => {
                        const selectedPage = relatedPages.find(
                          (page) => `/${page.slug}` === link.href,
                        );

                        return (
                          <div
                            key={`${block.id}-link-${linkIndex}`}
                            className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto]"
                          >
                            <label className="grid gap-2">
                              <span className="text-xs font-semibold text-slate-600">
                                Выберите страницу сайта
                              </span>
                              <select
                                value={selectedPage ? `/${selectedPage.slug}` : ""}
                                onChange={(event) => {
                                  const page = relatedPages.find(
                                    (item) => `/${item.slug}` === event.target.value,
                                  );

                                  updateLink(index, linkIndex, {
                                    href: event.target.value,
                                    text: link.text?.trim() || page?.label || "",
                                  });
                                }}
                                className={inputClassName}
                              >
                                <option value="">Выбрать из опубликованных</option>
                                {relatedPages.map((page) => (
                                  <option key={page.slug} value={`/${page.slug}`}>
                                    {pageTypeLabel(page.pageType)} · {page.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="grid gap-2">
                              <span className="text-xs font-semibold text-slate-600">
                                Подпись ссылки
                              </span>
                              <input
                                value={link.text ?? ""}
                                onChange={(event) =>
                                  updateLink(index, linkIndex, {
                                    text: event.target.value,
                                  })
                                }
                                className={inputClassName}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                updateBlock(index, {
                                  links: (block.links ?? []).filter(
                                    (_, itemIndex) => itemIndex !== linkIndex,
                                  ),
                                })
                              }
                              className="self-end rounded-lg border border-rose-200 px-3 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                            >
                              Убрать
                            </button>
                            <label className="grid gap-2 lg:col-span-3">
                              <span className="text-xs font-semibold text-slate-500">
                                Адрес ссылки — заполнится автоматически; можно указать свой
                              </span>
                              <input
                                value={link.href ?? ""}
                                onChange={(event) =>
                                  updateLink(index, linkIndex, {
                                    href: event.target.value,
                                  })
                                }
                                placeholder="/slug-stranicy или https://..."
                                className={inputClassName}
                              />
                            </label>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateBlock(index, {
                          links: [...(block.links ?? []), { text: "", href: "" }],
                        })
                      }
                      className="justify-self-start rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100"
                    >
                      + Добавить материал
                    </button>
                  </>
                ) : null}

                {!editable ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                    Этот служебный блок сохранён без изменений, чтобы не потерять
                    работающую логику страницы. Его редактирование здесь недоступно.
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}

        <div className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 p-4">
          <p className="text-sm font-bold text-slate-800">Добавить новый блок</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              ["heading", "+ Заголовок"],
              ["paragraph", "+ Текст"],
              ["list", "+ Список"],
              ["callout", "+ Заметка"],
              ["links", "+ Полезные материалы"],
            ].map(([type, label]) => (
              <button
                key={type}
                type="button"
                onClick={() => setBlocks((current) => [...current, createBlock(type)])}
                className="rounded-lg border border-emerald-200 bg-white px-3.5 py-2.5 text-sm font-bold text-emerald-800 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-100"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
