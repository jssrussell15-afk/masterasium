export function supabaseUrl(): string | undefined {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  return url || undefined;
}

export function supabaseKey(): string | undefined {
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();
  return key || undefined;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl() && supabaseKey());
}

export function requireSupabaseEnv(): { url: string; key: string } {
  const url = supabaseUrl();
  const key = supabaseKey();
  if (!url || !key) {
    throw new Error(
      "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).",
    );
  }
  return { url, key };
}
