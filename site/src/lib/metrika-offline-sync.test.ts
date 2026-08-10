import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOfflineConversionsCsv,
  getOfflineConversionUploadStatus,
  uploadOfflineConversionBatch,
} from "./metrika-offline-api";

test("CSV содержит ClientID, Unix-время и цену только когда она задана", () => {
  const csv = buildOfflineConversionsCsv([
    {
      clientId: "123456789",
      target: "leadgid_approved",
      eventAt: new Date("2026-08-11T09:00:00.000Z"),
      price: "1250.50",
      currency: "RUB",
    },
    {
      clientId: "987654321",
      target: "leadgid_hold",
      eventAt: new Date("2026-08-11T10:00:00.000Z"),
      price: null,
      currency: null,
    },
  ]);

  assert.equal(
    csv,
    "ClientId,Target,DateTime,Price,Currency\n" +
      "123456789,leadgid_approved,1786438800,1250.50,RUB\n" +
      "987654321,leadgid_hold,1786442400,,\n",
  );
});

test("mock-интеграция загружает CSV и читает upload ID", async () => {
  const requests: RequestInfo[] = [];
  const mockFetch: typeof fetch = async (input) => {
    requests.push(input);
    return Response.json({ uploading: { id: 456 } });
  };

  const uploadId = await uploadOfflineConversionBatch({
    counterId: "110922978",
    oauthToken: "test-token",
    csv: "ClientId,Target,DateTime,Price,Currency\n",
    fetchImplementation: mockFetch,
  });

  assert.equal(uploadId, "456");
  assert.equal(requests.length, 1);
});

test("mock-интеграция распознаёт итоговый статус обработки", async () => {
  const status = await getOfflineConversionUploadStatus({
    counterId: "110922978",
    oauthToken: "test-token",
    uploadId: "456",
    fetchImplementation: async () =>
      Response.json({ uploading: { id: 456, status: "PROCESSED" } }),
  });

  assert.equal(status, "PROCESSED");
});
