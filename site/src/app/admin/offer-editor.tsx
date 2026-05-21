import type { AffiliateOffer, Offer } from "@prisma/client";
import { createOffer, updateOffer } from "./offer-actions";
import { LogoFileField } from "./logo-file-field";

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

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
  pattern,
  title,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: unknown;
  type?: string;
  required?: boolean;
  pattern?: string;
  title?: string;
  hint?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={toFieldValue(defaultValue)}
        required={required}
        pattern={pattern}
        title={title}
        className="h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-900"
      />
      {hint ? <span className="text-xs leading-5 text-slate-500">{hint}</span> : null}
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
    <label className="grid gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <textarea
        name={name}
        defaultValue={value}
        rows={rows}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-900"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function OfferEditor({ offer }: { offer?: OfferWithAffiliate }) {
  const affiliateOffer = offer?.affiliateOffers.at(0);
  const isEdit = Boolean(offer);

  return (
    <form
      action={isEdit ? updateOffer : createOffer}
      className="grid gap-6 rounded-lg border border-slate-200 bg-slate-50 p-4"
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

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Название МФО" name="brandName" defaultValue={offer?.brandName} required />
        <Field
          label="Slug"
          name="slug"
          defaultValue={offer?.slug}
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          title="Латиница, цифры и дефисы, например zaymer или bistro-dengi"
          hint="Латиница, цифры и дефисы: zaymer, bistro-dengi."
        />
        <SelectField
          label="Статус"
          name="status"
          defaultValue={offer?.status === "DRAFT" ? "PAUSED" : offer?.status ?? "PAUSED"}
          options={[
            { value: "ACTIVE", label: "Активен" },
            { value: "PAUSED", label: "На паузе" },
            { value: "ARCHIVED", label: "Архив" },
          ]}
        />
        <Field label="Юр. название" name="legalName" defaultValue={offer?.legalName} />
        <Field label="Официальный сайт" name="officialSite" defaultValue={offer?.officialSite} />
        <Field label="Лого-текст" name="logoText" defaultValue={offer?.logoText} />
        <LogoFileField
          label="Логотип МФО"
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
        <TextArea label="Способы получения" name="payoutMethods" defaultValue={offer?.payoutMethods} />
        <TextArea label="Способы погашения" name="repaymentMethods" defaultValue={offer?.repaymentMethods} />
        <TextArea label="Требования" name="requirements" defaultValue={offer?.requirements} />
        <TextArea label="Документы" name="documents" defaultValue={offer?.documents} />
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
            hint="Например: Leads.su, Leadgid, прямой оффер."
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
          <Field label="Целевое действие" name="targetAction" defaultValue={affiliateOffer?.targetAction} />
          <Field label="Выплата" name="payoutAmount" defaultValue={affiliateOffer?.payoutAmount} />
          <Field label="Валюта" name="currency" defaultValue={affiliateOffer?.currency ?? "RUB"} />
          <Field label="Холд, дней" name="holdDays" type="number" defaultValue={affiliateOffer?.holdDays} />
          <Field label="Период сверки" name="reconciliationPeriod" defaultValue={affiliateOffer?.reconciliationPeriod} />
          <Field label="Дневной лимит" name="dailyCap" type="number" defaultValue={affiliateOffer?.dailyCap} />
          <Field label="Месячный лимит" name="monthlyCap" type="number" defaultValue={affiliateOffer?.monthlyCap} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <TextArea label="GEO включено" name="geoIncluded" defaultValue={affiliateOffer?.geoIncluded} />
          <TextArea label="GEO исключено" name="geoExcluded" defaultValue={affiliateOffer?.geoExcluded} />
          <TextArea label="Разрешенный трафик" name="allowedTrafficTypes" defaultValue={affiliateOffer?.allowedTrafficTypes} />
          <TextArea label="Запрещенный трафик" name="forbiddenTrafficTypes" defaultValue={affiliateOffer?.forbiddenTrafficTypes} />
        </div>
      </div>

      <button className="w-fit rounded-md bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800">
        {isEdit ? "Сохранить оффер" : "Создать оффер"}
      </button>
    </form>
  );
}
