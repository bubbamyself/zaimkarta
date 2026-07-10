const MIN_PRODUCTION_SECRET_LENGTH = 32;
const PLACEHOLDER_PATTERNS = [/change-this/i, /example/i, /local/i, /test/i];

export function getProductionSecret({
  name,
  value,
  localFallback,
}: {
  name: string;
  value: string | undefined;
  localFallback?: string;
}) {
  const secret = value?.trim();

  if (secret && process.env.NODE_ENV !== "production") {
    return secret;
  }

  if (secret && secret.length >= MIN_PRODUCTION_SECRET_LENGTH) {
    const hasPlaceholderValue = PLACEHOLDER_PATTERNS.some((pattern) =>
      pattern.test(secret),
    );

    if (!hasPlaceholderValue) {
      return secret;
    }
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `${name} must be a strong unique secret with at least ${MIN_PRODUCTION_SECRET_LENGTH} characters in production`,
    );
  }

  return secret || localFallback || "";
}
