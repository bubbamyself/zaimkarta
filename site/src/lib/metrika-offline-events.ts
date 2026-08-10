export const METRIKA_OFFLINE_TARGETS = {
  conversion: "leadgid_conversion",
  hold: "leadgid_hold",
  approved: "leadgid_approved",
  rejected: "leadgid_rejected",
} as const;

type SupportedStatus = "PENDING" | "APPROVED" | "REJECTED" | "UNKNOWN" | string;

export type MetrikaOfflineEventInput = {
  target: string;
  eventAt: Date;
  price: string | null;
  currency: string | null;
};

export function buildMetrikaOfflineEvents({
  isNewConversion,
  normalizedStatus,
  payoutAmount,
  currency,
  eventAt,
}: {
  isNewConversion: boolean;
  normalizedStatus: SupportedStatus;
  payoutAmount: string;
  currency: string;
  eventAt: Date;
}): MetrikaOfflineEventInput[] {
  const events: MetrikaOfflineEventInput[] = [];

  if (isNewConversion) {
    events.push({
      target: METRIKA_OFFLINE_TARGETS.conversion,
      eventAt,
      price: null,
      currency: null,
    });
  }

  if (normalizedStatus === "PENDING") {
    events.push({
      target: METRIKA_OFFLINE_TARGETS.hold,
      eventAt,
      price: null,
      currency: null,
    });
  }

  if (normalizedStatus === "REJECTED") {
    events.push({
      target: METRIKA_OFFLINE_TARGETS.rejected,
      eventAt,
      price: null,
      currency: null,
    });
  }

  if (normalizedStatus === "APPROVED") {
    const payout = Number(payoutAmount);
    const hasValidPayout =
      Number.isFinite(payout) && payout > 0 && /^[A-Z]{3}$/.test(currency);

    events.push({
      target: METRIKA_OFFLINE_TARGETS.approved,
      eventAt,
      price: hasValidPayout ? payout.toFixed(2) : null,
      currency: hasValidPayout ? currency : null,
    });
  }

  return events;
}
