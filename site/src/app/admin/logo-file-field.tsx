"use client";

import { useState } from "react";

type LogoFileFieldProps = {
  label: string;
  name: string;
  currentUrl?: string | null;
  hint?: string;
};

function validateSvgFile(file: File) {
  return new Promise<string | null>((resolve) => {
    if (file.type !== "image/svg+xml") {
      resolve("Загрузите логотип в формате SVG");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const svg = String(reader.result ?? "");

      if (!/<svg[\s>]/i.test(svg)) {
        resolve("Файл должен быть корректным SVG");
        return;
      }

      if (/<script|on\w+=|javascript:/i.test(svg)) {
        resolve("SVG не должен содержать скрипты или inline-обработчики");
        return;
      }

      resolve(null);
    };

    reader.onerror = () => resolve("Не удалось прочитать SVG");
    reader.readAsText(file);
  });
}

export function LogoFileField({
  label,
  name,
  currentUrl,
  hint,
}: LogoFileFieldProps) {
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  return (
    <label className="grid content-start gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input type="hidden" name="currentLogoUrl" value={currentUrl ?? ""} />
      <input
        name={name}
        type="file"
        accept=".svg,image/svg+xml"
        className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 file:mr-3 file:rounded-md file:border-0 file:bg-slate-950 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
        onChange={async (event) => {
          const input = event.currentTarget;
          const file = input.files?.[0];

          setError(null);
          setFileName(file?.name ?? "");

          if (!file) {
            return;
          }

          const nextError = await validateSvgFile(file);

          if (nextError) {
            input.value = "";
            setFileName("");
            setError(nextError);
          }
        }}
      />
      <span
        className={`min-h-5 text-xs leading-5 ${
          error ? "text-red-600" : fileName ? "text-emerald-700" : "text-slate-500"
        }`}
      >
        {error ?? (fileName ? `Выбран файл: ${fileName}` : hint ?? "")}
      </span>
      {currentUrl ? (
        <span className="flex min-h-10 items-center gap-3 text-xs text-slate-500">
          <img
            src={currentUrl}
            alt=""
            className="h-10 w-10 rounded-md border border-slate-200 bg-white object-contain p-1"
          />
          Загружен: {currentUrl}
        </span>
      ) : null}
    </label>
  );
}
