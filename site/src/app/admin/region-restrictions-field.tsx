"use client";

import { useMemo, useState } from "react";
import {
  getRussianRegionByCode,
  normalizeRegionCodes,
  RUSSIAN_REGIONS,
} from "@/lib/russian-regions";

type RegionRestrictionsFieldProps = {
  defaultValue?: string[] | null;
  name: string;
};

function normalizeSearch(value: string) {
  return value.trim().toLowerCase().replaceAll("ё", "е");
}

export function RegionRestrictionsField({
  defaultValue,
  name,
}: RegionRestrictionsFieldProps) {
  const [selectedCodes, setSelectedCodes] = useState(() =>
    normalizeRegionCodes(defaultValue ?? []),
  );
  const [query, setQuery] = useState("");
  const normalizedQuery = normalizeSearch(query);
  const selectedCodeSet = new Set(selectedCodes);

  const visibleRegions = useMemo(() => {
    if (!normalizedQuery) {
      return RUSSIAN_REGIONS;
    }

    return RUSSIAN_REGIONS.filter((region) => {
      const normalizedName = normalizeSearch(region.name);

      return (
        region.code.includes(normalizedQuery) ||
        region.number.includes(normalizedQuery) ||
        normalizedName.includes(normalizedQuery)
      );
    });
  }, [normalizedQuery]);

  function toggleRegion(code: string) {
    setSelectedCodes((currentCodes) => {
      if (currentCodes.includes(code)) {
        return currentCodes.filter((currentCode) => currentCode !== code);
      }

      return normalizeRegionCodes([...currentCodes, code]);
    });
  }

  function removeRegion(code: string) {
    setSelectedCodes((currentCodes) =>
      currentCodes.filter((currentCode) => currentCode !== code),
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div>
        <h4 className="font-bold text-slate-950">Региональные ограничения</h4>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Выберите регионы регистрации, для которых этот оффер не должен
          показываться на витрине.
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Если регион пользователя есть в этом списке, оффер будет скрыт на
          сайте и не будет доступен для перехода через CPA-ссылку.
        </p>
      </div>

      {selectedCodes.map((code) => (
        <input key={code} type="hidden" name={name} value={code} />
      ))}

      <label className="mt-4 grid gap-2">
        <span className="text-sm font-medium text-slate-700">Найти регион</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Найти регион"
          className="h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-900"
        />
      </label>

      <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
        {visibleRegions.length > 0 ? (
          <div className="grid gap-1 sm:grid-cols-2">
            {visibleRegions.map((region) => (
              <label
                key={region.code}
                className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-2 text-sm text-slate-700 hover:bg-white"
              >
                <input
                  type="checkbox"
                  checked={selectedCodeSet.has(region.code)}
                  onChange={() => toggleRegion(region.code)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span>
                  {region.number} — {region.name}
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className="px-2 py-4 text-sm text-slate-500">
            По этому запросу регионы не найдены.
          </p>
        )}
      </div>

      <div className="mt-4">
        {selectedCodes.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-2">
              {selectedCodes.map((code) => {
                const region = getRussianRegionByCode(code);

                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => removeRegion(code)}
                    className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    {code} — {region?.name ?? "Неизвестный регион"} ×
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setSelectedCodes([])}
              className="mt-3 text-sm font-semibold text-slate-600 hover:text-slate-950"
            >
              Очистить выбранные регионы
            </button>
          </>
        ) : (
          <p className="text-sm leading-6 text-slate-500">
            Региональных ограничений нет — оффер показывается для всех регионов.
          </p>
        )}
      </div>
    </section>
  );
}
