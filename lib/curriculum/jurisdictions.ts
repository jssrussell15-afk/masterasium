export type PublishStatus = "published" | "coming_soon" | "hidden";

export type Jurisdiction = {
  code: string;
  slug: string;
  name: string;
  displayOrder: number;
  publishStatus: PublishStatus;
  note: string | null;
};

/** Mirrors the jurisdiction seed. Publish status is updated as each province is imported. */
export const JURISDICTIONS: Jurisdiction[] = [
  { code: "ON", slug: "ontario", name: "Ontario", displayOrder: 1, publishStatus: "published", note: null },
  { code: "BC", slug: "british-columbia", name: "British Columbia", displayOrder: 2, publishStatus: "published", note: null },
  { code: "AB", slug: "alberta", name: "Alberta", displayOrder: 3, publishStatus: "published", note: null },
  { code: "SK", slug: "saskatchewan", name: "Saskatchewan", displayOrder: 4, publishStatus: "published", note: null },
  { code: "MB", slug: "manitoba", name: "Manitoba", displayOrder: 5, publishStatus: "published", note: null },
  { code: "NS", slug: "nova-scotia", name: "Nova Scotia", displayOrder: 6, publishStatus: "published", note: null },
  { code: "PE", slug: "prince-edward-island", name: "Prince Edward Island", displayOrder: 7, publishStatus: "published", note: null },
  { code: "NB", slug: "new-brunswick", name: "New Brunswick", displayOrder: 8, publishStatus: "coming_soon", note: null },
  { code: "NL", slug: "newfoundland-and-labrador", name: "Newfoundland and Labrador", displayOrder: 9, publishStatus: "coming_soon", note: null },
  { code: "YT", slug: "yukon", name: "Yukon", displayOrder: 10, publishStatus: "published", note: null },
  { code: "NT", slug: "northwest-territories", name: "Northwest Territories", displayOrder: 11, publishStatus: "coming_soon", note: null },
  { code: "NU", slug: "nunavut", name: "Nunavut", displayOrder: 12, publishStatus: "coming_soon", note: null },
  { code: "QC", slug: "quebec", name: "Quebec", displayOrder: 13, publishStatus: "hidden", note: "Hidden. The site excludes Quebec." },
];

export function jurisdictionBySlug(slug: string): Jurisdiction | undefined {
  return JURISDICTIONS.find((item) => item.slug === slug);
}

export function jurisdictionByCode(code: string): Jurisdiction | undefined {
  return JURISDICTIONS.find((item) => item.code === code);
}
