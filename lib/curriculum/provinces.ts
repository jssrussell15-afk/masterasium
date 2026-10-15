export type Province = {
  slug: string;
  name: string;
  short: string;
  /** A published skill list. Other provinces stay on the toggle until theirs is written. */
  ready: boolean;
};

/** Quebec is omitted. The product does not cover that curriculum. */
export const PROVINCES: Province[] = [
  { slug: "ontario", name: "Ontario", short: "ON", ready: true },
  { slug: "british-columbia", name: "British Columbia", short: "BC", ready: false },
  { slug: "alberta", name: "Alberta", short: "AB", ready: false },
  { slug: "saskatchewan", name: "Saskatchewan", short: "SK", ready: false },
  { slug: "manitoba", name: "Manitoba", short: "MB", ready: false },
  { slug: "new-brunswick", name: "New Brunswick", short: "NB", ready: false },
  { slug: "nova-scotia", name: "Nova Scotia", short: "NS", ready: false },
  { slug: "prince-edward-island", name: "Prince Edward Island", short: "PE", ready: false },
  { slug: "newfoundland-and-labrador", name: "Newfoundland and Labrador", short: "NL", ready: false },
  { slug: "yukon", name: "Yukon", short: "YT", ready: false },
  { slug: "northwest-territories", name: "Northwest Territories", short: "NT", ready: false },
  { slug: "nunavut", name: "Nunavut", short: "NU", ready: false },
];

export function provinceBySlug(slug: string): Province | undefined {
  return PROVINCES.find((province) => province.slug === slug);
}
