export const ROLES = ["parent", "teacher", "tutor", "student"] as const;

export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "desk",
  "settings",
  "worksheets",
  "roster",
  "curriculum",
  "practice",
  "practice.observe",
  "events.read",
  "events.write",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  parent: ["desk", "settings", "worksheets", "roster", "curriculum", "events.read"],
  teacher: ["worksheets", "curriculum", "events.read"],
  tutor: ["curriculum", "practice.observe", "events.read"],
  student: ["practice", "events.write"],
};

const PATH_PERMISSIONS: { prefix: string; permission: Permission }[] = [
  { prefix: "/dashboard", permission: "desk" },
  { prefix: "/settings", permission: "settings" },
  { prefix: "/worksheets", permission: "worksheets" },
  { prefix: "/practice", permission: "practice" },
];

export function can(role: Role | null, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function permissionForPath(pathname: string): Permission | null {
  const match = PATH_PERMISSIONS.find(
    (entry) => pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`),
  );
  return match?.permission ?? null;
}

export function canAccessPath(role: Role | null, pathname: string): boolean {
  const permission = permissionForPath(pathname);
  if (!permission) return true;
  return can(role, permission);
}

/** A student cookie wins, so a shared browser cannot open the parent desk. */
export function roleFromSession(input: { hasStudent: boolean; hasParent: boolean }): Role | null {
  if (input.hasStudent) return "student";
  if (input.hasParent) return "parent";
  return null;
}

export function homeFor(role: Role | "public"): string {
  if (role === "student") return "/practice";
  if (role === "parent") return "/dashboard";
  if (role === "teacher") return "/worksheets";
  return "/";
}

export function navFor(role: Role | "public"): { href: string; label: string }[] {
  if (role === "student") return [];
  if (role === "teacher") {
    return [
      { href: "/curriculum/ontario/grade-1", label: "Curriculum" },
      { href: "/worksheets", label: "Worksheets" },
    ];
  }
  if (role === "tutor") {
    return [{ href: "/curriculum/ontario/grade-1", label: "Curriculum" }];
  }
  const links = [
    { href: "/curriculum/ontario/grade-1", label: "Curriculum" },
    { href: "/worksheets", label: "Worksheets" },
    { href: "/dashboard", label: "Parent desk" },
  ];
  if (role === "parent") {
    links.push({ href: "/settings", label: "Account settings" });
  }
  return links;
}
