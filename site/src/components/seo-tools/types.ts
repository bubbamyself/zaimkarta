import type { OfferCardData } from "@/lib/offers";

export type SeoToolVariant = "FULL" | "COMPACT" | "INLINE";

export type OverpaymentCalculatorConfig = {
  defaults?: {
    amount?: number;
    termDays?: number;
    dailyRate?: number;
  };
  limits?: {
    amountMin?: number;
    amountMax?: number;
    termMinDays?: number;
    termMaxDays?: number;
    dailyRateMin?: number;
    dailyRateMax?: number;
  };
  steps?: {
    amount?: number;
    termDays?: number;
    dailyRate?: number;
  };
  labels?: {
    amount?: string;
    termDays?: string;
    dailyRate?: string;
  };
  result?: {
    title?: string;
    formulaNote?: string;
    showTotalReturn?: boolean;
    showOverpayment?: boolean;
    showDailyCost?: boolean;
  };
  cta?: {
    text?: string;
    target?: string;
  };
  riskNotice?: {
    text?: string;
  };
};

export type ApplicationChecklistConfig = {
  results?: {
    minPercent: number;
    title: string;
    text: string;
  }[];
  cta?: {
    text?: string;
    target?: string;
  };
  riskNotice?: {
    text?: string;
  };
};

export type SeoToolRenderProps<TConfig> = {
  title: string;
  intro?: string | null;
  config: TConfig;
  variant: SeoToolVariant;
  offers: OfferCardData[];
  pageType: string;
  categorySlug: string;
};
