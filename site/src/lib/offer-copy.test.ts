import assert from "node:assert/strict";
import test from "node:test";
import { getOfferCopySlugCandidate } from "./offer-copy";

test("slug копии получает последовательный безопасный суффикс", () => {
  assert.equal(getOfferCopySlugCandidate("zaymer", 1), "zaymer-copy");
  assert.equal(getOfferCopySlugCandidate("zaymer", 2), "zaymer-copy-2");
  assert.equal(getOfferCopySlugCandidate("zaymer", 15), "zaymer-copy-15");
});

test("некорректный номер копии отклоняется", () => {
  assert.throws(() => getOfferCopySlugCandidate("zaymer", 0));
});
