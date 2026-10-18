"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStudent } from "@/lib/auth/student";
import { requireUser } from "@/lib/auth/session";
import { contentFlagsEnabled } from "@/lib/content/flag";
import {
  decideItem,
  flagReason,
  numbersIn,
  reviseItem,
  type ContentTemplate,
  type Decision,
  type FlagSurface,
} from "@/lib/content/model";
import { rowToItem } from "@/lib/content/serve";
import { friendlyDbError } from "@/lib/db-error";

export type FlagState = { error?: string; note?: string };

async function requireAdmin() {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("admins") || message.includes("schema cache")) {
      return { error: "Content review is not ready yet." as const };
    }
    return { error: friendlyDbError(error) };
  }
  if (!data) return { error: "This page is for content admins." as const };
  return { supabase, user };
}

export async function reportContentFlag(_previous: FlagState, formData: FormData): Promise<FlagState> {
  if (!contentFlagsEnabled()) return { error: "This note is not open yet." };
  const childId = String(formData.get("childId") ?? "");
  const skillId = String(formData.get("skillId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  const prompt = String(formData.get("prompt") ?? "").trim();
  const surface = String(formData.get("surface") ?? "question");
  const reason = flagReason(String(formData.get("reason") ?? ""), String(formData.get("note") ?? ""));
  if (!childId || !prompt || !reason) return { error: "Add a short note first." };
  if (surface !== "question" && surface !== "walkthrough" && surface !== "explanation") {
    return { error: "That note could not be saved." };
  }
  if (!itemId && !skillId) return { error: "That note could not be saved." };

  const session = await requireStudent();
  if ("error" in session) return { error: session.error };
  if (session.child.id !== childId) return { error: "That note could not be saved." };

  const { error } = await session.supabase.from("content_flags").insert({
    item_id: itemId || null,
    generator_key: skillId || null,
    prompt: prompt.slice(0, 2000),
    numbers: numbersIn(prompt),
    child_id: childId,
    reason,
    surface: surface as FlagSurface,
    status: "open",
  });
  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("content_flags")) return { error: "This note could not be saved yet." };
    return { error: "This note could not be saved." };
  }
  return { note: "Sent." };
}

async function loadItem(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], id: string) {
  const { data, error } = await supabase
    .from("content_items")
    .select(
      "id, question_type, lane, difficulty, template, checker, status, source, reviewer_id, reviewed_at, version, skill:skill_id(slug)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return rowToItem(data as never);
}

export async function reviewContentItem(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if ("error" in admin) redirect(`/admin/content?notice=${encodeURIComponent(admin.error ?? "")}`);
  const id = String(formData.get("itemId") ?? "");
  const decision = String(formData.get("decision") ?? "") as Decision;
  const notes = String(formData.get("notes") ?? "");
  if (!id || (decision !== "approve" && decision !== "request_changes" && decision !== "retire")) {
    redirect("/admin/content?notice=Choose%20an%20item%20first.");
  }
  const current = await loadItem(admin.supabase, id);
  if (!current) redirect("/admin/content?notice=That%20item%20is%20not%20here.");
  const at = new Date().toISOString();
  const next = decideItem(current, decision, admin.user.id, at, notes);
  const { error: reviewError } = await admin.supabase.from("content_reviews").insert({
    item_id: next.review.itemId,
    version: next.review.version,
    reviewer_id: next.review.reviewerId,
    decision: next.review.decision,
    notes: next.review.notes,
  });
  if (reviewError) redirect(`/admin/content?notice=${encodeURIComponent(friendlyDbError(reviewError))}`);
  const { error } = await admin.supabase
    .from("content_items")
    .update({
      status: next.item.status,
      reviewer_id: next.item.reviewerId,
      reviewed_at: next.item.reviewedAt,
      updated_at: at,
    })
    .eq("id", id);
  if (error) redirect(`/admin/content?notice=${encodeURIComponent(friendlyDbError(error))}`);
  revalidatePath("/admin/content");
  redirect(`/admin/content?item=${id}`);
}

export async function reviseContentItem(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if ("error" in admin) redirect(`/admin/content?notice=${encodeURIComponent(admin.error ?? "")}`);
  const id = String(formData.get("itemId") ?? "");
  const prompt = String(formData.get("prompt") ?? "").trim();
  const answer = String(formData.get("answer") ?? "").trim();
  if (!id || !prompt || !answer) redirect("/admin/content?notice=Add%20the%20question%20and%20the%20answer.");
  const current = await loadItem(admin.supabase, id);
  if (!current) redirect("/admin/content?notice=That%20item%20is%20not%20here.");
  let slots = current.template.slots;
  const slotsText = String(formData.get("slots") ?? "").trim();
  if (slotsText) {
    try {
      const parsed = JSON.parse(slotsText) as Record<string, string | number>;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        redirect("/admin/content?notice=The%20sample%20numbers%20need%20to%20be%20a%20short%20list.");
      }
      slots = parsed;
    } catch {
      redirect("/admin/content?notice=The%20sample%20numbers%20need%20to%20be%20a%20short%20list.");
    }
  }
  const template: ContentTemplate = {
    prompt,
    answer,
    slots,
    ...(current.template.choices ? { choices: current.template.choices } : {}),
    ...(current.template.steps ? { steps: current.template.steps } : {}),
  };
  const next = reviseItem(current, template);
  const { error } = await admin.supabase
    .from("content_items")
    .update({
      template: next.template,
      version: next.version,
      status: next.status,
      reviewer_id: null,
      reviewed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) redirect(`/admin/content?notice=${encodeURIComponent(friendlyDbError(error))}`);
  revalidatePath("/admin/content");
  redirect(`/admin/content?item=${id}`);
}

export async function resolveContentFlag(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if ("error" in admin) redirect(`/admin/content?notice=${encodeURIComponent(admin.error ?? "")}`);
  const id = String(formData.get("flagId") ?? "");
  if (!id) redirect("/admin/content?notice=Choose%20a%20note%20first.");
  const { error } = await admin.supabase.from("content_flags").update({ status: "resolved" }).eq("id", id);
  if (error) redirect(`/admin/content?notice=${encodeURIComponent(friendlyDbError(error))}`);
  revalidatePath("/admin/content");
  redirect("/admin/content");
}
