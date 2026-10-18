import { createStudentClient, readStudentToken } from "@/lib/auth/student";
import { loadCreateFlags } from "@/lib/create/access";
import { clientGeneratePayload, handleCreateGenerate, type GenerateContext } from "@/lib/create/generate";
import { KID_SAFETY_MESSAGE } from "@/lib/create/moderate";
import { readPrototypeRate, rememberPrototypeRate } from "@/lib/create/rate-limit";
import { inspectTransport, MAX_JSON_BYTES, parseGenerateBody } from "@/lib/create/schema";

export const CREATE_RESPONSE_HEADERS = { "cache-control": "no-store" };

/**
 * Prototype by default. Sample assets only.
 * The body cannot carry prompt text. Multipart uploads are rejected.
 * This handler does not call xAI or a moderation vendor.
 */
export async function POST(request: Request) {
  const bytes = await request.arrayBuffer();
  const transport = inspectTransport({
    contentType: request.headers.get("content-type"),
    byteLength: bytes.byteLength,
  });
  if (!transport.ok) {
    return Response.json(
      { ok: false, error: transport.error, message: KID_SAFETY_MESSAGE },
      { status: transport.status, headers: CREATE_RESPONSE_HEADERS },
    );
  }
  if (bytes.byteLength > MAX_JSON_BYTES) {
    return Response.json(
      { ok: false, error: "too-large", message: KID_SAFETY_MESSAGE },
      { status: 413, headers: CREATE_RESPONSE_HEADERS },
    );
  }

  let raw: unknown;
  try {
    raw = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    raw = null;
  }
  const parsed = parseGenerateBody(raw);
  if (!parsed.ok) {
    return Response.json(
      { ok: false, error: "body", message: KID_SAFETY_MESSAGE },
      { status: 400, headers: CREATE_RESPONSE_HEADERS },
    );
  }

  const context = await serverContext();
  const result = await handleCreateGenerate(parsed.data, context, { mode: "prototype" });
  const audit = result.ok ? undefined : result.audit;
  if (context.optIn && (result.ok || audit)) {
    rememberPrototypeRate(parsed.data.childId, {
      ...context,
      generationsThisProject: result.ok ? context.generationsThisProject + 1 : (audit?.generationsThisProject ?? context.generationsThisProject),
      moderationBlocksToday: result.ok ? context.moderationBlocksToday : (audit?.moderationBlocksToday ?? context.moderationBlocksToday),
    });
  }
  return Response.json(clientGeneratePayload(result), {
    status: result.status,
    headers: CREATE_RESPONSE_HEADERS,
  });
}

/** Parent opt-in is read here. A missing flag or a missing student session stays closed. */
async function serverContext(): Promise<GenerateContext> {
  const closed: GenerateContext = {
    optIn: false,
    consent: false,
    projectsToday: 0,
    dailyProjectLimit: 1,
    generationsThisProject: 0,
    moderationBlocksToday: 0,
    parentProjectsToday: 0,
    ipGenerationsToday: 0,
  };
  try {
    const token = await readStudentToken();
    if (!token) return closed;
    const supabase = createStudentClient(token);
    const { data } = await supabase.from("children").select("id").maybeSingle();
    if (!data?.id) return closed;
    const flags = await loadCreateFlags(supabase, data.id);
    const rate = readPrototypeRate(data.id, flags.dailyLimit);
    return {
      ...rate,
      dailyProjectLimit: flags.dailyLimit,
      optIn: flags.enabled,
      consent: Boolean(flags.consentAt),
    };
  } catch {
    return closed;
  }
}
