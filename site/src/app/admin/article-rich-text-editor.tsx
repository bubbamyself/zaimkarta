"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ArticleRichTextEditorProps = {
  name: string;
  defaultValue?: string | null;
};

type ActiveFormats = {
  block: "p" | "h2" | "h3";
  bold: boolean;
  italic: boolean;
  underline: boolean;
  link: boolean;
};

function looksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function plainTextToHtml(value: string) {
  return value
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function normalizeInitialValue(value?: string | null) {
  if (!value) {
    return "";
  }

  return looksLikeHtml(value) ? value : plainTextToHtml(value);
}

function normalizeBlock(value: string): ActiveFormats["block"] {
  const normalized = value.toLowerCase();

  if (normalized.includes("h2") || normalized.includes("heading 2")) {
    return "h2";
  }

  if (normalized.includes("h3") || normalized.includes("heading 3")) {
    return "h3";
  }

  return "p";
}

function isInsideLink(node: Node | null, editor: HTMLElement) {
  let currentNode: Node | null = node;

  while (currentNode && currentNode !== editor) {
    if (
      currentNode instanceof HTMLElement &&
      currentNode.tagName.toLowerCase() === "a"
    ) {
      return true;
    }

    currentNode = currentNode.parentNode;
  }

  return false;
}

export function ArticleRichTextEditor({
  name,
  defaultValue,
}: ArticleRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const [html, setHtml] = useState(normalizeInitialValue(defaultValue));
  const [activeFormats, setActiveFormats] = useState<ActiveFormats>({
    block: "p",
    bold: false,
    italic: false,
    underline: false,
    link: false,
  });

  const updateActiveFormats = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();

    if (!editor || !selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);

    if (!editor.contains(range.commonAncestorContainer)) {
      return;
    }

    selectionRef.current = range.cloneRange();
    setActiveFormats({
      block: normalizeBlock(String(document.queryCommandValue("formatBlock"))),
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      link:
        isInsideLink(selection.anchorNode, editor) ||
        isInsideLink(selection.focusNode, editor),
    });
  }, []);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== html) {
      editorRef.current.innerHTML = html;
    }
  }, [html]);

  useEffect(() => {
    document.addEventListener("selectionchange", updateActiveFormats);

    return () => {
      document.removeEventListener("selectionchange", updateActiveFormats);
    };
  }, [updateActiveFormats]);

  function syncFromEditor() {
    setHtml(editorRef.current?.innerHTML ?? "");
    updateActiveFormats();
  }

  function restoreSelection() {
    const selection = window.getSelection();

    if (!selection || !selectionRef.current) {
      return;
    }

    selection.removeAllRanges();
    selection.addRange(selectionRef.current);
  }

  function runCommand(command: string, value?: string) {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand(command, false, value);
    syncFromEditor();
  }

  function setBlock(tag: "p" | "h2" | "h3") {
    runCommand("formatBlock", tag);
  }

  function createLink() {
    restoreSelection();
    const url = window.prompt("Адрес ссылки");

    if (!url) {
      return;
    }

    runCommand("createLink", url);
  }

  function getButtonClass(isActive = false) {
    return `rounded-md border px-3 py-2 text-sm font-semibold transition ${
      isActive
        ? "border-slate-400 bg-slate-200 text-slate-950"
        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
    }`;
  }

  return (
    <div className="grid gap-2">
      <input type="hidden" name={name} value={html} />
      <span className="text-sm font-medium text-slate-700">
        Основной текст статьи
      </span>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_96px]">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={syncFromEditor}
          onBlur={syncFromEditor}
          onKeyUp={updateActiveFormats}
          onMouseUp={updateActiveFormats}
          className="article-editor-prose min-h-[560px] rounded-md border border-slate-300 bg-white px-4 py-3 leading-7 text-slate-900 outline-none focus:border-emerald-600"
        />
        <div className="lg:relative">
          <div className="sticky top-4 flex flex-wrap gap-2 rounded-md border border-slate-200 bg-slate-50 p-2 shadow-sm lg:max-h-[calc(100vh-2rem)] lg:flex-col lg:overflow-y-auto">
            <button
              type="button"
              aria-pressed={activeFormats.block === "p"}
              onMouseDown={(event) => {
                event.preventDefault();
                setBlock("p");
              }}
              className={getButtonClass(activeFormats.block === "p")}
            >
              Текст
            </button>
            <button
              type="button"
              aria-pressed={activeFormats.block === "h2"}
              onMouseDown={(event) => {
                event.preventDefault();
                setBlock("h2");
              }}
              className={getButtonClass(activeFormats.block === "h2")}
            >
              H2
            </button>
            <button
              type="button"
              aria-pressed={activeFormats.block === "h3"}
              onMouseDown={(event) => {
                event.preventDefault();
                setBlock("h3");
              }}
              className={getButtonClass(activeFormats.block === "h3")}
            >
              H3
            </button>
            <button
              type="button"
              aria-pressed={activeFormats.bold}
              onMouseDown={(event) => {
                event.preventDefault();
                runCommand("bold");
              }}
              className={`${getButtonClass(activeFormats.bold)} font-bold`}
            >
              B
            </button>
            <button
              type="button"
              aria-pressed={activeFormats.italic}
              onMouseDown={(event) => {
                event.preventDefault();
                runCommand("italic");
              }}
              className={`${getButtonClass(activeFormats.italic)} italic`}
            >
              I
            </button>
            <button
              type="button"
              aria-pressed={activeFormats.underline}
              onMouseDown={(event) => {
                event.preventDefault();
                runCommand("underline");
              }}
              className={`${getButtonClass(activeFormats.underline)} underline`}
            >
              U
            </button>
            <button
              type="button"
              aria-pressed={activeFormats.link}
              onMouseDown={(event) => {
                event.preventDefault();
                createLink();
              }}
              className={getButtonClass(activeFormats.link)}
            >
              Link
            </button>
            <button
              type="button"
              aria-pressed={activeFormats.link}
              onMouseDown={(event) => {
                event.preventDefault();
                runCommand("unlink");
              }}
              className={getButtonClass(activeFormats.link)}
            >
              X
            </button>
          </div>
        </div>
      </div>
      <p className="text-sm leading-6 text-slate-500">
        Пиши статью как материал: H2/H3 для структуры, обычный текст для
        объяснений, ссылки на полезные страницы и мягкие переходы к инструментам
        или офферам, если они действительно помогают читателю. Каждый H2
        автоматически попадет в оглавление статьи и получит якорную ссылку.
      </p>
    </div>
  );
}
