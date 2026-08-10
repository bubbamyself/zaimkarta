const API_BASE_URL = "https://api-metrika.yandex.net/management/v1/counter";

export type MetrikaCsvRow = {
  clientId: string | null;
  target: string;
  eventAt: Date;
  price: { toString(): string } | string | null;
  currency: string | null;
};

export type MetrikaFetchImplementation = typeof fetch;

export class MetrikaApiError extends Error {
  constructor(
    readonly status: number | null,
    readonly retryable: boolean,
  ) {
    super(status === null ? "yandex_network_error" : `yandex_http_${status}`);
  }
}

function csvCell(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function buildOfflineConversionsCsv(rows: MetrikaCsvRow[]) {
  const lines = ["ClientId,Target,DateTime,Price,Currency"];

  for (const row of rows) {
    if (!row.clientId) {
      continue;
    }

    lines.push(
      [
        row.clientId,
        row.target,
        String(Math.floor(row.eventAt.getTime() / 1000)),
        row.price?.toString() ?? "",
        row.currency ?? "",
      ]
        .map(csvCell)
        .join(","),
    );
  }

  return `${lines.join("\n")}\n`;
}

function isRetryableStatus(status: number) {
  return status === 429 || status >= 500;
}

async function readJsonResponse(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new MetrikaApiError(response.status, false);
  }
}

export async function uploadOfflineConversionBatch({
  counterId,
  oauthToken,
  csv,
  fetchImplementation = fetch,
}: {
  counterId: string;
  oauthToken: string;
  csv: string;
  fetchImplementation?: MetrikaFetchImplementation;
}) {
  const form = new FormData();
  form.append(
    "file",
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
    "offline-conversions.csv",
  );

  let response: Response;

  try {
    response = await fetchImplementation(
      `${API_BASE_URL}/${counterId}/offline_conversions/upload?type=BASIC`,
      {
        method: "POST",
        headers: { Authorization: `OAuth ${oauthToken}` },
        body: form,
      },
    );
  } catch {
    throw new MetrikaApiError(null, true);
  }

  if (!response.ok) {
    throw new MetrikaApiError(response.status, isRetryableStatus(response.status));
  }

  const data = await readJsonResponse(response);
  const uploading =
    data && typeof data === "object" && "uploading" in data
      ? (data.uploading as { id?: unknown })
      : null;
  const uploadId = uploading?.id;

  if (typeof uploadId !== "number" && typeof uploadId !== "string") {
    throw new MetrikaApiError(response.status, false);
  }

  return String(uploadId);
}

export async function getOfflineConversionUploadStatus({
  counterId,
  oauthToken,
  uploadId,
  fetchImplementation = fetch,
}: {
  counterId: string;
  oauthToken: string;
  uploadId: string;
  fetchImplementation?: MetrikaFetchImplementation;
}) {
  let response: Response;

  try {
    response = await fetchImplementation(
      `${API_BASE_URL}/${counterId}/offline_conversions/uploading/${encodeURIComponent(uploadId)}`,
      { headers: { Authorization: `OAuth ${oauthToken}` } },
    );
  } catch {
    throw new MetrikaApiError(null, true);
  }

  if (!response.ok) {
    throw new MetrikaApiError(response.status, isRetryableStatus(response.status));
  }

  const data = await readJsonResponse(response);
  const uploading =
    data && typeof data === "object" && "uploading" in data
      ? (data.uploading as { status?: unknown })
      : null;

  if (typeof uploading?.status !== "string") {
    throw new MetrikaApiError(response.status, false);
  }

  return uploading.status;
}
