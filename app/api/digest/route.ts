import { timingSafeEqual } from "node:crypto";

export async function POST(request: Request) {
  const configured = process.env.DIGEST_CRON_SECRET;
  const provided = request.headers.get("x-digest-secret") ?? "";

  if (!configured || !secretsMatch(configured, provided)) {
    return Response.json(
      { ok: false, error: "Provide DIGEST_CRON_SECRET as the x-digest-secret header." },
      { status: 401 },
    );
  }

  return Response.json({
    ok: true,
    status: "stubbed",
    message:
      "Daily digest email is not sent. Parents save a per-child draft from the desk. A later mailer can read digest_stubs.",
  });
}

function secretsMatch(expected: string, provided: string): boolean {
  const left = Buffer.from(expected);
  const right = Buffer.from(provided);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
