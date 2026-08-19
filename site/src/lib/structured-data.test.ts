import assert from "node:assert/strict";
import test from "node:test";
import {
  getCategoryCollectionJsonLd,
  serializeJsonLd,
} from "./structured-data";

test("подборка получает CollectionPage и позиционный ItemList", () => {
  const jsonLd = getCategoryCollectionJsonLd({
    path: "/0-procentov-na-pervii-zaem",
    name: "Первый займ под 0%",
    description: "Подтверждённые предложения",
    dateModified: new Date("2026-08-19T00:00:00.000Z"),
    items: [
      { name: "MoneyMan", path: "/offers/moneyman" },
      { name: "Турбозайм", path: "/offers/turbozaim" },
    ],
  });

  assert.equal(jsonLd["@type"], "CollectionPage");
  assert.equal(jsonLd.mainEntity["@type"], "ItemList");
  assert.equal(jsonLd.mainEntity.numberOfItems, 2);
  assert.deepEqual(
    jsonLd.mainEntity.itemListElement.map((item) => item.position),
    [1, 2],
  );
  assert.match(
    jsonLd.mainEntity.itemListElement[0].item.url,
    /\/offers\/moneyman$/,
  );
});

test("JSON-LD экранирует открывающую угловую скобку", () => {
  assert.equal(serializeJsonLd({ text: "<script>" }), '{"text":"\\u003cscript>"}');
});
