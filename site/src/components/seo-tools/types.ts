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
  answers?: {
    label: string;
    value: number;
  }[];
  questions?: {
    id: string;
    text: string;
    weakTip?: string;
    answers?: {
      label: string;
      value: number;
    }[];
  }[];
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

export type RepaymentDateCalculatorConfig = {
  defaults?: {
    termDays?: number;
  };
  limits?: {
    termMinDays?: number;
    termMaxDays?: number;
  };
  quickTerms?: number[];
  labels?: {
    startDate?: string;
    termDays?: string;
    termUnit?: string;
  };
  result?: {
    titleTemplate?: string;
    pastText?: string;
    todayText?: string;
    futureTextTemplate?: string;
    weekendWarning?: string;
  };
  cta?: {
    text?: string;
    target?: string;
  };
  riskNotice?: {
    text?: string;
  };
};

export type ComparisonPriority =
  | "none"
  | "min_overpayment"
  | "fast_decision"
  | "payout_method"
  | "simple_requirements";

export type ComparisonConfig = {
  defaults?: {
    amount?: number;
    termDays?: number;
    priority?: ComparisonPriority;
  };
  limits?: {
    amountMin?: number;
    amountMax?: number;
    termMinDays?: number;
    termMaxDays?: number;
  };
  steps?: {
    amount?: number;
    termDays?: number;
  };
  quickAmounts?: number[];
  quickTerms?: number[];
  priorities?: {
    value: ComparisonPriority;
    label: string;
  }[];
  labels?: {
    firstOffer?: string;
    secondOffer?: string;
    amount?: string;
    termDays?: string;
    priority?: string;
  };
  result?: {
    title?: string;
    sameCostText?: string;
    notAvailableText?: string;
  };
  rows?: string[];
  cta?: {
    text?: string;
    target?: string;
  };
  riskNotice?: {
    text?: string;
  };
};

export type OverdueLoanCalculatorConfig = {
  defaults?: {
    principalDebt?: number;
    accruedInterestAtDueDate?: number;
    dailyRate?: number;
    annualPenaltyRate?: number;
    dailyPenaltyRate?: number;
    interestMode?: "yes" | "no" | "unknown";
  };
  limits?: {
    principalDebtMin?: number;
    principalDebtMax?: number;
    accruedInterestMin?: number;
    accruedInterestMax?: number;
    dailyRateMin?: number;
    dailyRateMax?: number;
    annualPenaltyRateMin?: number;
    annualPenaltyRateMax?: number;
    dailyPenaltyRateMin?: number;
    dailyPenaltyRateMax?: number;
  };
  labels?: {
    dueDate?: string;
    calculationDate?: string;
    principalDebt?: string;
    accruedInterestAtDueDate?: string;
    interestMode?: string;
    dailyRate?: string;
    annualPenaltyRate?: string;
    dailyPenaltyRate?: string;
    contractDate?: string;
    originalPrincipalAmount?: string;
    initialTermDays?: string;
    otherCharges?: string;
  };
  hints?: {
    partialPayments?: string;
    dailyRate?: string;
    penalty?: string;
    limit?: string;
    unknownInterestMode?: string;
  };
  result?: {
    title?: string;
    formulaTitle?: string;
  };
  links?: {
    label: string;
    href: string;
  }[];
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
  selectedRegionCode?: string | null;
};
