import assert from "node:assert/strict";
import test from "node:test";
import { hasActiveHttpsAffiliateOffer } from "./affiliate-offer-availability";

test("CPA-ready оффер требует корректную HTTPS-ссылку", () => {
  assert.equal(
    hasActiveHttpsAffiliateOffer([
      { trackingBaseUrl: "https://affiliate.example/apply" },
    ]),
    true,
  );
  assert.equal(
    hasActiveHttpsAffiliateOffer([
      { trackingBaseUrl: "http://affiliate.example/apply" },
    ]),
    false,
  );
  assert.equal(
    hasActiveHttpsAffiliateOffer([{ trackingBaseUrl: "not-a-url" }]),
    false,
  );
  assert.equal(hasActiveHttpsAffiliateOffer([]), false);
});
