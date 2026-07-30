import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  isValidLeadGidSecret,
  LeadGidPostbackValidationError,
  parseLeadGidPostback,
  processLeadGidPostback,
} from "@/lib/leadgid-postback";
import { checkRateLimit } from "@/lib/rate-limit";

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_REQUESTS = 120;
const RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
};

function response(body: string, status = 200) {
  return new NextResponse(body, {
    status,
    headers: RESPONSE_HEADERS,
  });
}

function getClientKey(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const clientIp =
    forwardedFor?.split(",").at(0)?.trim() || realIp?.trim() || "unknown";

  return createHash("sha256")
    .update(clientIp)
    .update(process.env.LEADGID_POSTBACK_SECRET ?? "")
    .digest("hex");
}

export async function GET(request: NextRequest) {
  const rateLimit = checkRateLimit({
    key: `leadgid:postback:${getClientKey(request)}`,
    limit: RATE_LIMIT_REQUESTS,
    windowMs: RATE_LIMIT_WINDOW_MS,
  });

  if (!rateLimit.allowed) {
    return new NextResponse("Too many requests", {
      status: 429,
      headers: {
        ...RESPONSE_HEADERS,
        "Retry-After": String(rateLimit.retryAfterSeconds),
      },
    });
  }

  const receivedSecrets = request.nextUrl.searchParams.getAll("secret");
  const receivedSecret = receivedSecrets.length === 1 ? receivedSecrets[0] : "";

  try {
    if (!receivedSecret || !isValidLeadGidSecret(receivedSecret)) {
      return response("Unauthorized", 401);
    }

    const input = parseLeadGidPostback(request.nextUrl.searchParams);
    const result = await processLeadGidPostback(input);

    return response(result.outcome === "ignored" ? "OK ignored" : "OK");
  } catch (error) {
    if (error instanceof LeadGidPostbackValidationError) {
      return response("Invalid postback", 400);
    }

    return response("Temporary error", 503);
  }
}
