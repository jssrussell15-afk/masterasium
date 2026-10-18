import { cache } from "react";

const requestSlug = cache(() => ({ slug: "" }));
let latestSlug = "";

/** Remember the province slug for this request so not-found can name it. */
export function rememberSlug(slug: string) {
  latestSlug = slug;
  requestSlug().slug = slug;
}

export function readSlug(): string {
  return requestSlug().slug || latestSlug;
}
