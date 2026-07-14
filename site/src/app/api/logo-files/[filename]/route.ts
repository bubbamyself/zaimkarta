import { readFile } from "node:fs/promises";
import path from "node:path";

const LOGO_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "logos");
const SAFE_LOGO_FILENAME_PATTERN =
  /^[a-z0-9]+(?:-[a-z0-9]+)*-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:png|svg)$/;

type LogoFileRouteContext = {
  params: Promise<{
    filename: string;
  }>;
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function notFoundResponse() {
  return new Response("Not found\n", {
    status: 404,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export async function GET(_request: Request, context: LogoFileRouteContext) {
  const { filename } = await context.params;

  if (!SAFE_LOGO_FILENAME_PATTERN.test(filename)) {
    return notFoundResponse();
  }

  const filePath = path.resolve(LOGO_UPLOAD_DIR, filename);

  if (!filePath.startsWith(`${path.resolve(LOGO_UPLOAD_DIR)}${path.sep}`)) {
    return notFoundResponse();
  }

  try {
    const file = await readFile(filePath);
    const contentType = filename.endsWith(".png") ? "image/png" : "image/svg+xml";

    return new Response(new Uint8Array(file), {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return notFoundResponse();
    }

    return new Response("Unable to read logo\n", {
      status: 500,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }
}
