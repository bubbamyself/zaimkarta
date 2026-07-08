import type { AffiliateOffer, Offer } from "@prisma/client";
import { createOffer, updateOffer } from "./offer-actions";
import { OfferFormShell } from "./offer-form-shell";
import { LogoFileField } from "./logo-file-field";
import { RegionRestrictionsField } from "./region-restrictions-field";

export type OfferWithAffiliate = Offer & {
  affiliateOffers: AffiliateOffer[];
};

function toInputDate(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function toFieldValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object" && "toString" in value) {
    return value.toString();
  }

  return String(value);
}

function hasChecklistValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return value !== null && value !== undefined;
}

function getPublicationChecklist(
  offer: OfferWithAffiliate | undefined,
  affiliateOffer: AffiliateOffer | undefined,
) {
  return [
    ["Название кредитора", offer?.brandName],
    ["Slug", offer?.slug],
    ["Юр. название", offer?.legalName],
    ["Лого-текст", offer?.logoText],
    ["Логотип кредитора", offer?.logoUrl],
    ["Официальный сайт", offer?.officialSite],
    ["Короткое описание", offer?.shortDescription],
    ["Бейдж", offer?.badge],
    ["Приоритет показа", offer?.displayPriority],
    ["Дата проверки условий", offer?.conditionsCheckedAt],
    ["Мин. сумма", offer?.minAmount],
    ["Макс. сумма", offer?.maxAmount],
    ["Мин. срок", offer?.minTermDays],
    ["Макс. срок", offer?.maxTermDays],
    ["Ставка от", offer?.dailyRateFrom],
    ["Ставка до", offer?.dailyRateTo],
    ["ПСК от", offer?.pskFrom],
    ["ПСК до", offer?.pskTo],
    ["Рейтинг", offer?.rating],
    ["Отзывы", offer?.reviewsCount],
    ["Одобрение", offer?.approvalLabel],
    ["Время решения", offer?.decisionTime],
    ["Способы получения", offer?.payoutMethods],
    ["Способы погашения", offer?.repaymentMethods],
    ["Требования", offer?.requirements],
    ["Документы", offer?.documents],
    ["Плюсы/теги", offer?.advantages],
    ["Предупреждения", offer?.warnings],
    ["Юридическая/рекламная сноска", offer?.legalDisclosure],
    ["CPA-сеть", affiliateOffer?.networkName],
    ["Offer ID в сети", affiliateOffer?.networkOfferId],
    ["Партнерская ссылка", affiliateOffer?.trackingBaseUrl],
    ["Ссылка активна", affiliateOffer?.isActive ? "yes" : null],
  ].map(([label, value]) => ({
    label: String(label),
    ready: hasChecklistValue(value),
  }));
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
  pattern,
  title,
  hint,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: unknown;
  type?: string;
  required?: boolean;
  pattern?: string;
  title?: string;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <label className="grid content-start gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={toFieldValue(defaultValue)}
        required={required}
        pattern={pattern}
        title={title}
        placeholder={placeholder}
        className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-900"
      />
      <span className="min-h-5 text-xs leading-5 text-slate-500">
        {hint ?? ""}
      </span>
    </label>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
  rows = 3,
}: {
  label: string;
  name: string;
  defaultValue?: string[] | string | null;
  rows?: number;
}) {
  const value = Array.isArray(defaultValue)
    ? defaultValue.join("\n")
    : defaultValue ?? "";

  return (
    <label className="grid content-start gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <textarea
        name={name}
        defaultValue={value}
        rows={rows}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
      />
    </label>
  );
}

const PAYOUT_METHOD_OPTIONS = [
  { value: "онлайн", label: "Онлайн" },
  { value: "карта", label: "На карту" },
  { value: "сбп", label: "СБП" },
  { value: "наличные", label: "Наличные" },
  { value: "банковский счет", label: "Банковский счет" },
  { value: "электронный кошелек", label: "Электронный кошелек" },
];

const REPAYMENT_METHOD_OPTIONS = [
  { value: "карта", label: "Банковская карта" },
  { value: "сбп", label: "СБП" },
  { value: "перевод", label: "Банковский перевод" },
  { value: "наличные", label: "Наличные" },
  { value: "личный кабинет", label: "Личный кабинет" },
  { value: "терминал", label: "Терминал" },
];

const REQUIREMENT_OPTIONS = [
  { value: "гражданство РФ", label: "Гражданство РФ" },
  { value: "возраст от 18 лет", label: "Возраст от 18 лет" },
  { value: "именная банковская карта", label: "Именная банковская карта" },
  { value: "постоянная регистрация", label: "Постоянная регистрация" },
  { value: "мобильный телефон", label: "Мобильный телефон" },
  { value: "доход или источник погашения", label: "Доход или источник погашения" },
];

const DOCUMENT_OPTIONS = [
  { value: "паспорт РФ", label: "Паспорт РФ" },
  { value: "СНИЛС", label: "СНИЛС" },
  { value: "ИНН", label: "ИНН" },
  { value: "банковская карта", label: "Банковская карта" },
  { value: "селфи с паспортом", label: "Селфи с паспортом" },
  { value: "справка о доходах", label: "Справка о доходах" },
  { value: "документ на залог", label: "Документ на залог" },
];

function withSelectedOptions(
  options: { value: string; label: string }[],
  selected: string[],
) {
  const optionValues = new Set(options.map((option) => option.value));
  const extraOptions = selected
    .filter((value) => !optionValues.has(value))
    .map((value) => ({
      value,
      label: `Текущее значение: ${value}`,
    }));

  return [...options, ...extraOptions];
}

function CheckboxGroup({
  label,
  name,
  defaultValue,
  options,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string[] | null;
  options: { value: string; label: string }[];
  hint?: string;
}) {
  const selected = new Set(defaultValue ?? []);
  const allOptions = withSelectedOptions(options, defaultValue ?? []);

  return (
    <fieldset className="grid content-start gap-2 rounded-lg border border-slate-200 bg-white p-3">
      <legend className="px-1 text-sm font-medium text-slate-700">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {allOptions.map((option) => (
          <label
            key={option.value}
            className="flex min-h-9 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700"
          >
            <input
              type="checkbox"
              name={name}
              value={option.value}
              defaultChecked={selected.has(option.value)}
              className="h-4 w-4 rounded border-slate-300"
            />
            {option.label}
          </label>
        ))}
      </div>
      {hint ? <p className="text-xs leading-5 text-slate-500">{hint}</p> : null}
    </fieldset>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
  hint?: string;
}) {
  return (
    <label className="grid content-start gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-900"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="min-h-5 text-xs leading-5 text-slate-500">
        {hint ?? ""}
      </span>
    </label>
  );
}

export function OfferEditor({ offer }: { offer?: OfferWithAffiliate }) {
  const affiliateOffer = offer?.affiliateOffers.at(0);
  const isEdit = Boolean(offer);
  const publicationChecklist = getPublicationChecklist(offer, affiliateOffer);
  const readyCount = publicationChecklist.filter((item) => item.ready).length;
  const missingItems = publicationChecklist.filter((item) => !item.ready);

  return (
    <OfferFormShell
      action={isEdit ? updateOffer : createOffer}
      submitLabel={isEdit ? "Сохранить оффер" : "Создать оффер"}
    >
      {offer ? <input type="hidden" name="offerId" value={offer.id} /> : null}
      {affiliateOffer ? (
        <input type="hidden" name="affiliateOfferId" value={affiliateOffer.id} />
      ) : null}

      <div>
        <h3 className="text-lg font-bold text-slate-950">
          {isEdit ? "Редактирование оффера" : "Новый оффер"}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Это внутренняя форма для оффера, который ты сам выбрал в CPA-сети.
        </p>
      </div>

      <details className="rounded-lg border border-slate-200 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800">
          Чеклист готовности к публикации: {readyCount}/
          {publicationChecklist.length}
        </summary>
        <div className="border-t border-slate-200 p-4">
          <p className="text-sm leading-6 text-slate-600">
            Черновик можно сохранить неполным. Статус “Активен” пройдет только
            после заполнения всех пунктов ниже.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {publicationChecklist.map((item) => (
              <span
                key={item.label}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                  item.ready
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {item.ready ? "✓" : "—"} {item.label}
              </span>
            ))}
          </div>
          {missingItems.length > 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              Не хватает: {missingItems.map((item) => item.label).join(", ")}.
            </p>
          ) : (
            <p className="mt-4 text-sm font-semibold text-emerald-700">
              Оффер готов к публикации.
            </p>
          )}
        </div>
      </details>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Название кредитора" name="brandName" defaultValue={offer?.brandName} required />
        <Field
          label="Slug"
          name="slug"
          defaultValue={offer?.slug}
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          title="Латиница, цифры и дефисы, например zaymer или bistro-dengi"
          placeholder="zaymer"
          hint="Технический адрес оффера."
        />
        <SelectField
          label="Статус"
          name="status"
          defaultValue={offer?.status ?? "DRAFT"}
          options={[
            { value: "DRAFT", label: "Черновик" },
            { value: "ACTIVE", label: "Активен" },
            { value: "PAUSED", label: "На паузе" },
            { value: "ARCHIVED", label: "Архив" },
          ]}
        />
        <Field label="Юр. название" name="legalName" defaultValue={offer?.legalName} />
        <Field label="Официальный сайт" name="officialSite" defaultValue={offer?.officialSite} />
        <Field label="Лого-текст" name="logoText" defaultValue={offer?.logoText} />
        <LogoFileField
          label="Логотип кредитора"
          name="logoFile"
          currentUrl={offer?.logoUrl}
          hint="Только SVG. Лучше использовать прозрачный или белый фон."
        />
        <Field label="Бейдж" name="badge" defaultValue={offer?.badge} />
        <Field label="Приоритет показа" name="displayPriority" type="number" defaultValue={offer?.displayPriority ?? 100} />
        <Field label="Дата проверки условий" name="conditionsCheckedAt" type="date" defaultValue={toInputDate(offer?.conditionsCheckedAt ?? null)} />
      </div>

      <TextArea
        label="Короткое описание"
        name="shortDescription"
        defaultValue={offer?.shortDescription}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Field label="Мин. сумма" name="minAmount" type="number" defaultValue={offer?.minAmount} />
        <Field label="Макс. сумма" name="maxAmount" type="number" defaultValue={offer?.maxAmount} />
        <Field label="Мин. срок, дней" name="minTermDays" type="number" defaultValue={offer?.minTermDays} />
        <Field label="Макс. срок, дней" name="maxTermDays" type="number" defaultValue={offer?.maxTermDays} />
        <Field label="Ставка от, %/день" name="dailyRateFrom" defaultValue={offer?.dailyRateFrom} />
        <Field label="Ставка до, %/день" name="dailyRateTo" defaultValue={offer?.dailyRateTo} />
        <Field label="ПСК от, %" name="pskFrom" defaultValue={offer?.pskFrom} />
        <Field label="ПСК до, %" name="pskTo" defaultValue={offer?.pskTo} />
        <Field label="Рейтинг" name="rating" defaultValue={offer?.rating} />
        <Field label="Отзывы" name="reviewsCount" type="number" defaultValue={offer?.reviewsCount ?? 0} />
        <Field label="Одобрение" name="approvalLabel" defaultValue={offer?.approvalLabel} />
        <SelectField
          label="Тон одобрения"
          name="approvalTone"
          defaultValue={offer?.approvalTone ?? "MEDIUM"}
          options={[
            { value: "LOW", label: "Низкий" },
            { value: "MEDIUM", label: "Средний" },
            { value: "HIGH", label: "Высокий" },
          ]}
        />
        <Field label="Время решения" name="decisionTime" defaultValue={offer?.decisionTime} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CheckboxGroup
          label="Способы получения"
          name="payoutMethods"
          defaultValue={offer?.payoutMethods}
          options={PAYOUT_METHOD_OPTIONS}
          hint="Используется в фильтрах и SEO-инструментах."
        />
        <CheckboxGroup
          label="Способы погашения"
          name="repaymentMethods"
          defaultValue={offer?.repaymentMethods}
          options={REPAYMENT_METHOD_OPTIONS}
        />
        <CheckboxGroup
          label="Требования"
          name="requirements"
          defaultValue={offer?.requirements}
          options={REQUIREMENT_OPTIONS}
          hint="Выбирай стандартные признаки, чтобы фильтры работали предсказуемо."
        />
        <CheckboxGroup
          label="Документы"
          name="documents"
          defaultValue={offer?.documents}
          options={DOCUMENT_OPTIONS}
          hint="Поле участвует в чек-листе перед заявкой."
        />
        <TextArea label="Плюсы/теги" name="advantages" defaultValue={offer?.advantages} />
        <TextArea label="Предупреждения" name="warnings" defaultValue={offer?.warnings} />
      </div>

      <TextArea
        label="Юридическая/рекламная сноска"
        name="legalDisclosure"
        defaultValue={offer?.legalDisclosure}
      />

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h4 className="font-bold text-slate-950">Партнерская ссылка</h4>
        <p className="mt-1 text-sm text-slate-500">
          Сюда вставляется ссылка, которую ты сам получил в CPA-сети.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Field
            label="CPA-сеть"
            name="networkName"
            defaultValue={affiliateOffer?.networkName}
            placeholder="Leads.su"
            hint="Название сети или прямой оффер."
          />
          <Field label="Offer ID в сети" name="networkOfferId" defaultValue={affiliateOffer?.networkOfferId} />
          <SelectField
            label="Ссылка активна"
            name="affiliateIsActive"
            defaultValue={affiliateOffer?.isActive === false ? "off" : "on"}
            options={[
              { value: "on", label: "Да" },
              { value: "off", label: "Нет" },
            ]}
          />
          <Field
            label="Партнерская ссылка"
            name="trackingBaseUrl"
            defaultValue={affiliateOffer?.trackingBaseUrl}
            required={!isEdit}
          />
        </div>
        <details className="mt-5 rounded-lg border border-slate-200 bg-slate-50">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">
            Справочная памятка по условиям CPA
          </summary>
          <div className="grid gap-4 border-t border-slate-200 p-4 md:grid-cols-3">
            <Field label="Целевое действие" name="targetAction" defaultValue={affiliateOffer?.targetAction} />
            <Field label="Выплата" name="payoutAmount" defaultValue={affiliateOffer?.payoutAmount} />
            <Field label="Валюта" name="currency" defaultValue={affiliateOffer?.currency ?? "RUB"} />
            <Field label="Холд, дней" name="holdDays" type="number" defaultValue={affiliateOffer?.holdDays} />
            <Field label="Период сверки" name="reconciliationPeriod" defaultValue={affiliateOffer?.reconciliationPeriod} />
            <Field label="Дневной лимит" name="dailyCap" type="number" defaultValue={affiliateOffer?.dailyCap} />
            <Field label="Месячный лимит" name="monthlyCap" type="number" defaultValue={affiliateOffer?.monthlyCap} />
          </div>
          <div className="grid gap-4 px-4 pb-4 md:grid-cols-2">
            <TextArea label="GEO включено" name="geoIncluded" defaultValue={affiliateOffer?.geoIncluded} />
            <TextArea label="GEO исключено" name="geoExcluded" defaultValue={affiliateOffer?.geoExcluded} />
            <TextArea label="Разрешенный трафик" name="allowedTrafficTypes" defaultValue={affiliateOffer?.allowedTrafficTypes} />
            <TextArea label="Запрещенный трафик" name="forbiddenTrafficTypes" defaultValue={affiliateOffer?.forbiddenTrafficTypes} />
          </div>
        </details>
      </div>

      <RegionRestrictionsField
        name="restrictedRegionCodes"
        defaultValue={offer?.restrictedRegionCodes}
      />

    </OfferFormShell>
  );
}
