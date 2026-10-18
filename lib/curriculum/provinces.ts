import { JURISDICTIONS } from "@/lib/curriculum/jurisdictions";

export type Province = {
  slug: string;
  name: string;
  short: string;
  /** A published curriculum. Hidden provinces, including Quebec, are omitted. */
  ready: boolean;
};

/** Quebec is omitted. The product does not cover that curriculum. */
export const PROVINCES: Province[] = JURISDICTIONS.filter((item) => item.publishStatus !== "hidden").map((item) => ({
  slug: item.slug,
  name: item.name,
  short: item.code,
  ready: item.publishStatus === "published",
}));

export function provinceBySlug(slug: string): Province | undefined {
  return PROVINCES.find((province) => province.slug === slug);
}
