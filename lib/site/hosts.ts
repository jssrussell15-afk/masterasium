const APEX = "masterasium.com";

export const ALLOWED_HOSTS = [APEX, `www.${APEX}`, "localhost", "127.0.0.1"] as const;

export function hostnameOf(host: string): string {
  const first = host.split(",")[0]?.trim() ?? "";
  if (first.startsWith("[")) {
    const end = first.indexOf("]");
    return end > 1 ? first.slice(1, end).toLowerCase() : "";
  }
  const colon = first.lastIndexOf(":");
  const port = colon > -1 ? first.slice(colon + 1) : "";
  if (colon > -1 && /^\d+$/.test(port)) return first.slice(0, colon).toLowerCase();
  return first.toLowerCase();
}

export function isWorkersDevHost(host: string): boolean {
  const name = hostnameOf(host);
  return name.endsWith(".workers.dev") && name.length > ".workers.dev".length;
}

export function isAllowedHostname(host: string): boolean {
  const name = hostnameOf(host);
  if ((ALLOWED_HOSTS as readonly string[]).includes(name)) return true;
  return isWorkersDevHost(name);
}

/** Email links and auth redirects only use a host we serve. Anything else uses the apex. */
export function publicOrigin(host: string, proto: string | null): string {
  const name = hostnameOf(host);
  if (name === APEX || name === `www.${APEX}`) return `https://${APEX}`;
  if (!isAllowedHostname(name)) return `https://${APEX}`;
  const scheme = proto === "http" ? "http" : "https";
  const raw = host.split(",")[0]?.trim() || name;
  return `${scheme}://${raw}`;
}

/** www and plain http on the apex go to https://masterasium.com. Path includes the query string. */
export function canonicalRedirectTarget(input: {
  host: string;
  proto: string | null;
  path: string;
}): string | null {
  const name = hostnameOf(input.host);
  const path = input.path.startsWith("/") ? input.path : `/${input.path}`;
  if (name === `www.${APEX}`) return `https://${APEX}${path}`;
  if (name === APEX && input.proto === "http") return `https://${APEX}${path}`;
  return null;
}

export function robotsHeader(host: string): "noindex, nofollow" | null {
  return isWorkersDevHost(host) ? "noindex, nofollow" : null;
}

export function showTestMode(appEnv: string | undefined): boolean {
  return appEnv?.trim() !== "production";
}

export function analyticsToken(value: string | undefined): string | null {
  const token = value?.trim() ?? "";
  return token.length > 0 ? token : null;
}
