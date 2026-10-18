import { ContentAdmin } from "@/components/content-admin";
import { Shell } from "@/components/site-header";
import { requireUser } from "@/lib/auth/session";
import type { ContentFlag } from "@/lib/content/model";
import { rowToItem } from "@/lib/content/serve";
import { friendlyDbError } from "@/lib/db-error";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Content review",
};

const ITEM_COLUMNS =
  "id, question_type, lane, difficulty, template, checker, status, source, reviewer_id, reviewed_at, version, skill:skill_id(slug)";

export default async function AdminContentPage() {
  const { supabase, user } = await requireUser();
  const admin = await supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (admin.error) {
    const message = admin.error.message.toLowerCase();
    return (
      <Shell role="parent">
        <p className="hint mt-8">
          {message.includes("admins") || message.includes("schema cache")
            ? "Content review is not ready yet."
            : friendlyDbError(admin.error)}
        </p>
      </Shell>
    );
  }
  if (!admin.data) {
    return (
      <Shell role="parent">
        <p className="hint mt-8">This page is for content admins.</p>
      </Shell>
    );
  }

  const [items, flags] = await Promise.all([
    supabase.from("content_items").select(ITEM_COLUMNS).order("updated_at", { ascending: false }),
    supabase.from("content_flags").select("id, item_id, generator_key, prompt, numbers, child_id, reason, surface, status, created_at").eq("status", "open"),
  ]);

  if (items.error || flags.error) {
    return (
      <Shell role="parent">
        <p className="hint mt-8">Content review is not ready yet.</p>
      </Shell>
    );
  }

  return (
    <Shell role="parent">
      <ContentAdmin
        items={(items.data as never[]).map((row) => rowToItem(row))}
        flags={(flags.data ?? []).map(flagRow)}
      />
    </Shell>
  );
}

function flagRow(row: {
  id: string;
  item_id: string | null;
  generator_key: string | null;
  prompt: string;
  numbers: unknown;
  child_id: string;
  reason: string;
  surface: ContentFlag["surface"];
  status: ContentFlag["status"];
  created_at: string;
}): ContentFlag {
  return {
    id: row.id,
    itemId: row.item_id,
    generatorKey: row.generator_key,
    prompt: row.prompt,
    numbers: Array.isArray(row.numbers) ? row.numbers.map(String) : [],
    childId: row.child_id,
    reason: row.reason,
    surface: row.surface,
    status: row.status,
    createdAt: row.created_at,
  };
}
