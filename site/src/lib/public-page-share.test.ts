import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPublicPageShareUrl,
  buildPublicShareImageUrl,
} from "./public-page-share";

test("строит внутреннюю ссылку на подборку только с фиксированными UTM", () => {
  const url = new URL(
    buildPublicPageShareUrl({
      origin: "https://zaimkarta.ru/current?lead_id=secret",
      pathname: "/zaimy-pod-0-na-pervyy-zaym?click_id=secret#offers",
      pageType: "category",
      pageSlug: "zaimy-pod-0-na-pervyy-zaym",
    }),
  );

  assert.equal(url.origin, "https://zaimkarta.ru");
  assert.equal(url.pathname, "/zaimy-pod-0-na-pervyy-zaym");
  assert.equal(url.searchParams.get("utm_source"), "page_share");
  assert.equal(url.searchParams.get("utm_medium"), "referral");
  assert.equal(url.searchParams.get("utm_campaign"), "category");
  assert.equal(url.searchParams.get("utm_content"), "zaimy-pod-0-na-pervyy-zaym");
  assert.equal(url.searchParams.has("lead_id"), false);
  assert.equal(url.searchParams.has("click_id"), false);
  assert.equal(url.hash, "");
});

test("строит внутреннюю ссылку и Open Graph URL для оффера", () => {
  const sharedUrl = new URL(
    buildPublicPageShareUrl({
      origin: "https://zaimkarta.ru",
      pathname: "/offers/belkacredit",
      pageType: "offer",
      pageSlug: "belkacredit",
    }),
  );
  const imageUrl = new URL(
    buildPublicShareImageUrl({
      origin: "https://zaimkarta.ru",
      pageType: "offer",
      pageSlug: "belkacredit",
    }),
  );

  assert.equal(sharedUrl.pathname, "/offers/belkacredit");
  assert.equal(sharedUrl.searchParams.get("utm_campaign"), "offer");
  assert.equal(imageUrl.pathname, "/api/og/public-share");
  assert.equal(imageUrl.searchParams.get("type"), "offer");
  assert.equal(imageUrl.searchParams.get("slug"), "belkacredit");
});

test("не разрешает передать внешний адрес вместо слага ZaimKarta", () => {
  assert.throws(() =>
    buildPublicPageShareUrl({
      origin: "https://zaimkarta.ru",
      pathname: "https://evil.example/offer",
      pageType: "offer",
      pageSlug: "offer",
    }),
  );
});
