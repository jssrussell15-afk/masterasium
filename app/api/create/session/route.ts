import { createStudentClient, readStudentToken } from "@/lib/auth/student";
import { toSessionRow } from "@/lib/create/session-meta";

/** Stores metadata only. Creative fields are dropped before the insert. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const row = toSessionRow(body);
  if (!row) return Response.json({ ok: false, error: "meta" }, { status: 400 });

  const token = await readStudentToken();
  if (!token) return Response.json({ ok: true, stored: false });

  const supabase = createStudentClient(token);
  const { error } = await supabase.from("create_sessions").insert(row);
  if (error) return Response.json({ ok: true, stored: false });
  return Response.json({ ok: true, stored: true });
}
