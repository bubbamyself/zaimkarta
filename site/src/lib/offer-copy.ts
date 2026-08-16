export function getOfferCopySlugCandidate(
  sourceSlug: string,
  copyNumber: number,
) {
  if (!Number.isSafeInteger(copyNumber) || copyNumber < 1) {
    throw new Error("Номер копии должен быть положительным целым числом.");
  }

  return copyNumber === 1
    ? `${sourceSlug}-copy`
    : `${sourceSlug}-copy-${copyNumber}`;
}
