"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { clearSupabaseSession } from "@/lib/auth/clear-session";
import {
  SIGNUP_PRACTICE_COOKIE,
  STUDENT_COOKIE,
  studentCookieOptions,
} from "@/lib/auth/student-cookie";
import { readStudentToken, revokeStudentToken } from "@/lib/auth/student";
import {
  readSignupHandoff,
  readSignupPractice,
  signupHandoffCookie,
  signupPracticePath,
  signupReadyPath,
} from "@/lib/children/signup-practice";
import { friendlyDbError } from "@/lib/db-error";
import { isSupportedGrade } from "@/lib/grades";
import { ensureProfile, requireUser } from "@/lib/auth/session";
import {
  readRememberedChildren,
  rememberChild,
  TABLET_CHILDREN_COOKIE,
  TABLET_CHILDREN_MAX_AGE,
  withPinLength,
  writeRememberedChildren,
} from "@/lib/children/tablet";
import { storedUsername } from "@/lib/children/username";
import {
  childFirstNameError,
  isValidFirstName,
  isValidPin,
  isValidUsername,
  normalizeFirstName,
  normalizeUsername,
} from "@/lib/validation";

export type ChildState = {
  error?: string;
};

function isUsernameTaken(error: { message: string; code?: string }): boolean {
  const message = error.message.toLowerCase();
  return error.code === "23505" || message.includes("children_username");
}

async function withFreeUsername(
  firstName: string,
  save: (
    username: string,
  ) => PromiseLike<{ error: { message: string; code?: string } | null }>,
): Promise<ChildState | "saved"> {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    const username = storedUsername(firstName, attempt);
    if (!username) return { error: "That name could not be saved. Try the first name again." };
    const { error } = await save(username);
    if (!error) return "saved";
    if (!isUsernameTaken(error)) return { error: friendlyDbError(error) };
  }
  return { error: "That name could not be saved. Try the first name again." };
}

function pinFields(formData: FormData): { pin: string } | { error: string } {
  const pin = String(formData.get("pin") ?? "").trim();
  const confirm = String(formData.get("confirmPin") ?? "").trim();
  if (!isValidPin(pin)) return { error: "Use a PIN of 4 to 6 digits." };
  if (pin !== confirm) return { error: "Those PINs do not match." };
  return { pin };
}

export async function addChild(_previous: ChildState, formData: FormData): Promise<ChildState> {
  const { supabase, user } = await requireUser();
  const firstName = normalizeFirstName(String(formData.get("firstName") ?? ""));
  const grade = Number(formData.get("grade"));
  const pin = pinFields(formData);

  const nameError = childFirstNameError(firstName);
  if (nameError) return { error: nameError };
  if (!isSupportedGrade(grade)) {
    return { error: "Choose a grade from 1 to 8." };
  }
  if ("error" in pin) return { error: pin.error };

  const profileError = await ensureProfile(supabase, user.id);
  if (profileError) return { error: friendlyDbError(profileError) };

  const { count, error: countError } = await supabase
    .from("children")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", user.id);
  if (countError) return { error: friendlyDbError(countError) };
  if ((count ?? 0) >= 2) return { error: "This account already has 2 children." };

  const saved = await withFreeUsername(firstName, (username) =>
    supabase.rpc("create_child_profile", {
      p_first_name: firstName,
      p_grade: grade,
      p_username: username,
      p_pin: pin.pin,
    }),
  );
  if (saved !== "saved") return saved;
  redirect("/dashboard");
}

/** Signup step 2. Saves the name and grade, then shows the confirmation card. */
export async function addSignupChild(
  _previous: ChildState,
  formData: FormData,
): Promise<ChildState> {
  const { supabase, user } = await requireUser();
  const firstName = normalizeFirstName(String(formData.get("firstName") ?? ""));
  const grade = Number(formData.get("grade"));

  const nameError = childFirstNameError(firstName);
  if (nameError) return { error: nameError };
  if (!isSupportedGrade(grade)) {
    return { error: "Choose a grade from 1 to 8." };
  }

  const profileError = await ensureProfile(supabase, user.id);
  if (profileError) return { error: friendlyDbError(profileError) };

  const { data, error } = await supabase.rpc("create_signup_child", {
    p_first_name: firstName,
    p_grade: grade,
  });
  if (error) return { error: friendlyDbError(error) };

  const practice = readSignupPractice(data);
  if (!practice) {
    return {
      error:
        "A child cannot be saved yet. The child profile is not ready in the database.",
    };
  }

  const store = await cookies();
  store.set(SIGNUP_PRACTICE_COOKIE, signupHandoffCookie(practice), studentCookieOptions());
  redirect(signupReadyPath(practice.childId));
}

/** The parent chose to practice on this device. The first skill is the grade warm-up. */
export async function startSignupPractice(
  _previous: ChildState,
  formData: FormData,
): Promise<ChildState> {
  const childId = String(formData.get("childId") ?? "");
  const store = await cookies();
  const handoff = readSignupHandoff(store.get(SIGNUP_PRACTICE_COOKIE)?.value);
  if (!handoff || handoff.childId !== childId) {
    return { error: "Practice could not start from this page. Go to the parent desk." };
  }

  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("children")
    .select("id, first_name")
    .eq("id", childId)
    .maybeSingle();
  if (error) return { error: friendlyDbError(error) };
  if (!data) return { error: "That child is not on this account." };

  const firstName = normalizeFirstName(String(data.first_name ?? ""));
  if (isValidFirstName(firstName)) {
    const next = rememberChild(readRememberedChildren(store.get(TABLET_CHILDREN_COOKIE)?.value), {
      id: data.id,
      firstName,
    });
    store.set(
      TABLET_CHILDREN_COOKIE,
      writeRememberedChildren(next),
      studentCookieOptions(TABLET_CHILDREN_MAX_AGE),
    );
  }

  const previous = await readStudentToken();
  await clearSupabaseSession();
  await revokeStudentToken(previous);
  store.set(STUDENT_COOKIE, handoff.token, studentCookieOptions());
  store.set(SIGNUP_PRACTICE_COOKIE, "", studentCookieOptions(0));
  redirect(signupPracticePath(childId));
}

/** Saves this child on the device, then opens student sign-in for their name and PIN. */
export async function startPracticeOnDevice(
  previous: TabletState,
  formData: FormData,
): Promise<TabletState> {
  const saved = await rememberTabletChild(previous, formData);
  if (saved.error || !saved.remembered) return saved;
  redirect("/login?as=student");
}

export type TabletState = {
  error?: string;
  remembered?: boolean;
};

/** Saves this child on the device so student sign-in can show their name. */
export async function rememberTabletChild(
  _previous: TabletState,
  formData: FormData,
): Promise<TabletState> {
  const { supabase } = await requireUser();
  const childId = String(formData.get("childId") ?? "");
  if (!childId) return { error: "Choose a child first." };

  const { data, error } = await supabase
    .from("children")
    .select("id, first_name")
    .eq("id", childId)
    .maybeSingle();
  if (error) return { error: friendlyDbError(error) };

  const firstName = normalizeFirstName(String(data?.first_name ?? ""));
  if (!data || !isValidFirstName(firstName)) {
    return { error: "That child is not on this account." };
  }

  const store = await cookies();
  const next = rememberChild(readRememberedChildren(store.get(TABLET_CHILDREN_COOKIE)?.value), {
    id: data.id,
    firstName,
  });
  store.set(TABLET_CHILDREN_COOKIE, writeRememberedChildren(next), studentCookieOptions(TABLET_CHILDREN_MAX_AGE));
  return { remembered: true };
}

/** The parent keeps this browser and leaves the confirmation. */
export async function leaveSignupToDesk(
  _previous: ChildState,
  _formData: FormData,
): Promise<ChildState> {
  await requireUser();
  const store = await cookies();
  store.set(SIGNUP_PRACTICE_COOKIE, "", studentCookieOptions(0));
  redirect("/dashboard");
}

/** Saves a 4–6 digit PIN. The username is created from the first name when needed. */
export async function setChildPin(
  _previous: ChildState,
  formData: FormData,
): Promise<ChildState> {
  const { supabase } = await requireUser();
  const childId = String(formData.get("childId") ?? "");
  const pin = String(formData.get("pin") ?? "").trim();
  const returnTo = String(formData.get("returnTo") ?? "");

  if (!childId) return { error: "Choose a child first." };
  if (!isValidPin(pin)) return { error: "Use a PIN of 4 to 6 digits." };

  const { data, error: readError } = await supabase
    .from("children")
    .select("id, first_name, username")
    .eq("id", childId)
    .maybeSingle();
  if (readError) return { error: friendlyDbError(readError) };
  if (!data) return { error: "That child is not on this account." };

  if (data.username) {
    const { error } = await supabase.rpc("reset_student_pin", {
      p_child_id: childId,
      p_pin: pin,
    });
    if (error) return { error: friendlyDbError(error) };
  } else {
    const saved = await withFreeUsername(String(data.first_name ?? ""), (username) =>
      supabase.rpc("set_student_login", {
        p_child_id: childId,
        p_username: username,
        p_pin: pin,
      }),
    );
    if (saved !== "saved") return saved;
  }

  await rememberPinLength(childId, pin);
  redirect(returnTo === "dashboard" ? "/dashboard?notice=pin" : "/settings?notice=pin");
}

export async function setStudentLogin(
  _previous: ChildState,
  formData: FormData,
): Promise<ChildState> {
  const { supabase } = await requireUser();
  const childId = String(formData.get("childId") ?? "");
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const pin = pinFields(formData);

  if (!childId) return { error: "Choose a child first." };
  if (!isValidUsername(username)) {
    return { error: "Use 3 to 20 letters or numbers, with no spaces." };
  }
  if ("error" in pin) return { error: pin.error };

  const { error } = await supabase.rpc("set_student_login", {
    p_child_id: childId,
    p_username: username,
    p_pin: pin.pin,
  });
  if (error) return { error: friendlyDbError(error) };
  await rememberPinLength(childId, pin.pin);
  redirect("/settings?notice=login");
}

export async function resetStudentPin(
  _previous: ChildState,
  formData: FormData,
): Promise<ChildState> {
  const { supabase } = await requireUser();
  const childId = String(formData.get("childId") ?? "");
  const pin = pinFields(formData);

  if (!childId) return { error: "Choose a child first." };
  if ("error" in pin) return { error: pin.error };

  const { error } = await supabase.rpc("reset_student_pin", {
    p_child_id: childId,
    p_pin: pin.pin,
  });
  if (error) return { error: friendlyDbError(error) };
  await rememberPinLength(childId, pin.pin);
  redirect("/settings?notice=pin");
}

async function rememberPinLength(childId: string, pin: string): Promise<void> {
  if (pin.length < 4 || pin.length > 6) return;
  const store = await cookies();
  const current = readRememberedChildren(store.get(TABLET_CHILDREN_COOKIE)?.value);
  const next = withPinLength(current, childId, pin.length);
  if (next === current) return;
  store.set(TABLET_CHILDREN_COOKIE, writeRememberedChildren(next), studentCookieOptions(TABLET_CHILDREN_MAX_AGE));
}

export async function setNextGradeUnlock(
  _previous: ChildState,
  formData: FormData,
): Promise<ChildState> {
  const { supabase } = await requireUser();
  const childId = String(formData.get("childId") ?? "");
  const unlocked = String(formData.get("unlocked") ?? "") === "1";
  if (!childId) return { error: "Choose a child first." };

  const { error } = await supabase.rpc("set_next_grade_unlock", {
    p_child_id: childId,
    p_unlocked: unlocked,
  });
  if (error) return { error: friendlyDbError(error) };
  redirect("/settings?notice=grade");
}

export async function decideGradeRequest(
  _previous: ChildState,
  formData: FormData,
): Promise<ChildState> {
  const { supabase } = await requireUser();
  const childId = String(formData.get("childId") ?? "");
  const approve = String(formData.get("approve") ?? "") === "1";
  if (!childId) return { error: "Choose a child first." };

  const { error } = await supabase.rpc("decide_grade_request", {
    p_child_id: childId,
    p_approve: approve,
  });
  if (error) return { error: friendlyDbError(error) };
  redirect(approve ? "/settings?notice=grade-approved" : "/settings?notice=grade-declined");
}

export async function setMoveAhead(_previous: ChildState, formData: FormData): Promise<ChildState> {
  const { supabase } = await requireUser();
  const childId = String(formData.get("childId") ?? "");
  const enabled = String(formData.get("enabled") ?? "") === "1";
  if (!childId) return { error: "Choose a child first." };

  const { error } = await supabase.rpc("set_move_ahead", {
    p_child_id: childId,
    p_enabled: enabled,
  });
  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("set_move_ahead") || message.includes("move_ahead")) {
      return { error: "Let them move ahead is not ready yet." };
    }
    return { error: friendlyDbError(error) };
  }
  redirect("/dashboard");
}
