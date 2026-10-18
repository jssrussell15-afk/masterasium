import { handleCreateGenerate, type GenerateInput, type GenerateKind } from "@/lib/create/generate";
import { isProject } from "@/lib/create/types";

/**
 * Prototype by default (CREATE_MODE unset or "prototype").
 * Sample assets only. This handler does not call xAI.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Partial<GenerateInput> | null;
  const projectType = body && typeof body.projectType === "string" ? body.projectType : "";
  if (!body || typeof body.childId !== "string" || !isProject(projectType)) {
    return Response.json({ ok: false, error: "body" }, { status: 400 });
  }
  const kind = body.kind;
  if (kind !== "spark" && kind !== "character" && kind !== "setting" && kind !== "page") {
    return Response.json({ ok: false, error: "body" }, { status: 400 });
  }
  const result = await handleCreateGenerate({
    childId: body.childId,
    projectType,
    kind: kind as GenerateKind,
    chips: Array.isArray(body.chips) ? body.chips.filter((chip) => typeof chip === "string") : [],
    pageIndex: typeof body.pageIndex === "number" ? body.pageIndex : 1,
    refresh: typeof body.refresh === "number" ? body.refresh : 0,
    writeMyOwn: typeof body.writeMyOwn === "string" ? body.writeMyOwn : undefined,
    optIn: body.optIn === true,
    consent: body.consent === true,
    projectsToday: typeof body.projectsToday === "number" ? body.projectsToday : 0,
    dailyLimit: typeof body.dailyLimit === "number" ? body.dailyLimit : 1,
    generationsThisProject:
      typeof body.generationsThisProject === "number" ? body.generationsThisProject : 0,
  });
  if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: result.status });
  return Response.json(
    {
      ok: true,
      mode: result.mode,
      source: result.source,
      assets: result.assets,
      notice: result.notice ?? null,
    },
    { status: 200 },
  );
}
