"use client";

import { useState } from "react";

const MAX_LOGO_BYTES = 400 * 1024;
const MAX_LOGO_DIMENSION = 4096;
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

type LogoFileFieldProps = {
  label: string;
  name: string;
  currentUrl?: string | null;
  hint?: string;
};

async function validatePngFile(file: File) {
  if (file.size > MAX_LOGO_BYTES) {
    return "Файл слишком большой. Максимум — 400 КБ";
  }

  if (file.type !== "image/png" || !file.name.toLowerCase().endsWith(".png")) {
    return "Загрузите логотип в формате PNG";
  }

  try {
    const bytes = new Uint8Array(await file.slice(0, 24).arrayBuffer());
    const hasPngSignature = PNG_SIGNATURE.every(
      (byte, index) => bytes[index] === byte,
    );
    const hasHeader = String.fromCharCode(...bytes.slice(12, 16)) === "IHDR";

    if (bytes.length < 24 || !hasPngSignature || !hasHeader) {
      return "Файл должен быть корректным PNG";
    }

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const width = view.getUint32(16);
    const height = view.getUint32(20);

    if (
      width === 0 ||
      height === 0 ||
      width > MAX_LOGO_DIMENSION ||
      height > MAX_LOGO_DIMENSION
    ) {
      return "Размер логотипа не должен превышать 4096×4096 px";
    }

    return null;
  } catch {
    return "Не удалось прочитать PNG";
  }
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
        accept=".png,image/png"
        className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 file:mr-3 file:rounded-md file:border-0 file:bg-slate-950 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
        onChange={async (event) => {
          const input = event.currentTarget;
          const file = input.files?.[0];

          setError(null);
          setFileName(file?.name ?? "");

          if (!file) {
            return;
          }

          const nextError = await validatePngFile(file);

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
