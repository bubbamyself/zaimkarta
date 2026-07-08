"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getRussianRegionByCode,
  RUSSIAN_REGIONS,
} from "@/lib/russian-regions";

const REGION_COOKIE_NAME = "zk_region_code";
const REGION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function readCookie(name: string) {
  return document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase().replaceAll("ё", "е");
}

export function RegionRegistrationControl() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [draftCode, setDraftCode] = useState("55");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const cookieCode = readCookie(REGION_COOKIE_NAME);
      const region = getRussianRegionByCode(cookieCode);

      if (region) {
        setSelectedCode(region.code);
        setDraftCode(region.code);
        return;
      }

      setIsOpen(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const selectedRegion = getRussianRegionByCode(selectedCode);
  const normalizedQuery = normalizeSearch(query);
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

  function saveRegion() {
    const region = getRussianRegionByCode(draftCode);

    if (!region) {
      return;
    }

    document.cookie = `${REGION_COOKIE_NAME}=${region.code}; Max-Age=${REGION_COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
    setSelectedCode(region.code);
    setIsOpen(false);
    window.location.reload();
  }

  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-700 hover:text-emerald-800"
      >
        {selectedRegion
          ? `Регион регистрации: ${selectedRegion.name}`
          : "Выбрать регион регистрации"}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4 py-6">
          <section className="max-h-[90vh] w-full max-w-xl overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-xl font-bold text-slate-950">
                Регион регистрации
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Здравствуйте! Выберите регион вашей регистрации — так мы покажем
                предложения, которые с большей вероятностью подходят вам по
                условиям кредиторов.
              </p>
            </div>

            <div className="grid gap-4 p-5">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">
                  Найти регион
                </span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Найти регион"
                  className="h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-900"
                />
              </label>

              <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
                {visibleRegions.length > 0 ? (
                  <div className="grid gap-1">
                    {visibleRegions.map((region) => (
                      <label
                        key={region.code}
                        className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-2 text-sm text-slate-700 hover:bg-white"
                      >
                        <input
                          type="radio"
                          name="publicRegionCode"
                          value={region.code}
                          checked={draftCode === region.code}
                          onChange={() => setDraftCode(region.code)}
                          className="h-4 w-4 border-slate-300"
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
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 p-5 sm:flex-row sm:justify-end">
              {selectedRegion ? (
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800"
                >
                  Закрыть
                </button>
              ) : null}
              <button
                type="button"
                onClick={saveRegion}
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                Показать подходящие предложения
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
