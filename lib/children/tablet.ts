import { isValidFirstName, normalizeFirstName } from "@/lib/validation";

/** Names saved on this device so a student can tap their own button. */
export const TABLET_CHILDREN_COOKIE = "masterasium_tablet_children";

/** Long enough that a family tablet keeps the names between visits. */
export const TABLET_CHILDREN_MAX_AGE = 60 * 60 * 24 * 400;

const CHILD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CHILDREN = 2;

export type RememberedChild = {
  id: string;
  firstName: string;
};

export function readRememberedChildren(value: string | null | undefined): RememberedChild[] {
  if (!value) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const children: RememberedChild[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id : "";
    const firstName = typeof record.firstName === "string" ? normalizeFirstName(record.firstName) : "";
    if (!CHILD_ID.test(id) || !isValidFirstName(firstName)) continue;
    if (children.some((child) => child.id === id)) continue;
    children.push({ id, firstName });
    if (children.length === MAX_CHILDREN) break;
  }
  return children;
}

/** Keeps an existing child in place. A new one is added at the end, up to two. */
export function rememberChild(children: RememberedChild[], child: RememberedChild): RememberedChild[] {
  const index = children.findIndex((item) => item.id === child.id);
  if (index >= 0) {
    const next = children.slice();
    next[index] = child;
    return next;
  }
  return [...children, child].slice(-MAX_CHILDREN);
}

export function writeRememberedChildren(children: RememberedChild[]): string {
  return JSON.stringify(children.map((child) => ({ id: child.id, firstName: child.firstName })));
}
