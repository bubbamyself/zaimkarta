export const DEFAULT_PROMO_TITLE = "0% на первый заем для новых клиентов";

type DecimalLike = number | string | { toString(): string } | null | undefined;

export type PromoOfferData = {
  promoEnabled: boolean;
  promoTitle: string | null;
  promoDailyRate: DecimalLike;
  promoPsk: DecimalLike;
  promoMinAmount: number | null;
  promoMaxAmount: number | null;
  promoZeroTermDays: number | null;
  promoNewClientsOnly: boolean;
  promoConditions: string | null;
  promoLateConsequences?: string | null;
  promoPaidServices?: string | null;
  promoSourceUrl: string | null;
  promoCheckedAt: Date | string | null;
};

export type PromoFieldErrors = Record<string, string>;

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function toNumber(value: DecimalLike) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(typeof value === "object" ? value.toString() : value);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasValidDate(value: Date | string | null) {
  if (!value) {
    return false;
  }

  const date = value instanceof Date ? value : new Date(value);
  return !Number.isNaN(date.getTime());
}

function hasHttpsUrl(value: string | null) {
  if (!value) {
    return false;
  }

  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function getPromoFieldErrors(
  promo: PromoOfferData,
  options: { requireComplete?: boolean } = {},
): PromoFieldErrors {
  if (!promo.promoEnabled) {
    return {};
  }

  const requireComplete = options.requireComplete ?? true;
  const errors: PromoFieldErrors = {};
  const dailyRate = toNumber(promo.promoDailyRate);
  const psk = toNumber(promo.promoPsk);

  if (requireComplete && !hasText(promo.promoTitle)) {
    errors.promoTitle = "Укажите название акции.";
  }

  if (requireComplete && dailyRate === null) {
    errors.promoDailyRate = "Укажите ставку по акции.";
  } else if (dailyRate !== null && dailyRate < 0) {
    errors.promoDailyRate = "Ставка по акции не может быть отрицательной.";
  }

  if (requireComplete && psk === null) {
    errors.promoPsk = "Укажите ПСК по акции.";
  } else if (psk !== null && psk < 0) {
    errors.promoPsk = "ПСК по акции не может быть отрицательной.";
  }

  if (requireComplete && promo.promoMinAmount === null) {
    errors.promoMinAmount = "Укажите минимальную сумму по акции.";
  } else if (promo.promoMinAmount !== null && promo.promoMinAmount < 0) {
    errors.promoMinAmount = "Минимальная сумма не может быть отрицательной.";
  }

  if (requireComplete && promo.promoMaxAmount === null) {
    errors.promoMaxAmount = "Укажите максимальную сумму по акции.";
  } else if (promo.promoMaxAmount !== null && promo.promoMaxAmount < 0) {
    errors.promoMaxAmount = "Максимальная сумма не может быть отрицательной.";
  }

  if (
    promo.promoMinAmount !== null &&
    promo.promoMaxAmount !== null &&
    promo.promoMinAmount > promo.promoMaxAmount
  ) {
    errors.promoMaxAmount =
      "Максимальная сумма по акции должна быть не меньше минимальной.";
  }

  if (requireComplete && promo.promoZeroTermDays === null) {
    errors.promoZeroTermDays = "Укажите срок действия нулевой ставки.";
  } else if (
    promo.promoZeroTermDays !== null &&
    promo.promoZeroTermDays <= 0
  ) {
    errors.promoZeroTermDays = "Срок акции должен быть больше нуля дней.";
  }

  if (requireComplete && !hasText(promo.promoConditions)) {
    errors.promoConditions = "Опишите условия сохранения нулевой ставки.";
  }

  if (requireComplete && !hasText(promo.promoSourceUrl)) {
    errors.promoSourceUrl = "Добавьте официальный источник условий акции.";
  } else if (hasText(promo.promoSourceUrl) && !hasHttpsUrl(promo.promoSourceUrl)) {
    errors.promoSourceUrl = "Официальный источник должен быть корректной HTTPS-ссылкой.";
  }

  if (requireComplete && !promo.promoCheckedAt) {
    errors.promoCheckedAt = "Укажите дату последней проверки акции.";
  } else if (promo.promoCheckedAt && !hasValidDate(promo.promoCheckedAt)) {
    errors.promoCheckedAt = "Дата проверки акции указана некорректно.";
  }

  return errors;
}

export function isPromoReady(promo: PromoOfferData) {
  return promo.promoEnabled && Object.keys(getPromoFieldErrors(promo)).length === 0;
}
