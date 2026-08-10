import "dotenv/config";
import assert from "node:assert/strict";
import test from "node:test";
import { normalizeLeadGidStatus } from "./leadgid-postback";

test("статусы hold и pending нормализуются в PENDING", () => {
  assert.equal(normalizeLeadGidStatus("hold"), "PENDING");
  assert.equal(normalizeLeadGidStatus("pending"), "PENDING");
});

test("статусы success и loan_issued нормализуются в APPROVED", () => {
  assert.equal(normalizeLeadGidStatus("success"), "APPROVED");
  assert.equal(normalizeLeadGidStatus("loan_issued"), "APPROVED");
});

test("статус reject нормализуется в REJECTED", () => {
  assert.equal(normalizeLeadGidStatus("reject"), "REJECTED");
});
