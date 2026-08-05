export const CALCULATOR_ANALYTICS_EVENT = "zk-calculator-analytics";

export type CalculatorAnalyticsGoal =
  | "calculator_personalized_result_viewed"
  | "share_link_created"
  | "share_link_copied"
  | "share_native_opened"
  | "share_native_completed"
  | "shared_link_opened"
  | "shared_calculator_changed"
  | "calculator_offer_list_requested"
  | "calculator_offer_list_shown"
  | "calculator_offer_list_empty"
  | "overdue_active_loan_answered";

export type CalculatorAnalyticsParams = {
  tool_type: "overpayment" | "repayment_date" | "overdue";
  page_slug: string;
  template_state?: string;
  share_method?: "native" | "clipboard" | "manual";
  scenario?: "amount_term" | "term" | "paid_only";
  answer?: "yes" | "no";
  offers_count_bucket?: "0" | "1_3" | "4_plus";
  source: "direct" | "shared";
};

export type CalculatorAnalyticsDetail = {
  goal: CalculatorAnalyticsGoal;
  params: CalculatorAnalyticsParams;
};

export function publishCalculatorAnalytics(
  goal: CalculatorAnalyticsGoal,
  params: CalculatorAnalyticsParams,
) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<CalculatorAnalyticsDetail>(CALCULATOR_ANALYTICS_EVENT, {
      detail: { goal, params },
    }),
  );
}

export function getOffersCountBucket(count: number) {
  if (count <= 0) {
    return "0" as const;
  }

  if (count <= 3) {
    return "1_3" as const;
  }

  return "4_plus" as const;
}
