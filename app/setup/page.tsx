import { Shell } from "@/components/site-header";

export default function SetupPage() {
  return (
    <Shell narrow>
      <section className="card mt-8 grid gap-3">
        <h1 className="display text-4xl">Add the Supabase keys</h1>
        <p className="lede">
          The landing page works without them. Accounts, practice, and the notify list need a
          Supabase project.
        </p>
        <ol className="grid list-decimal gap-2 pl-5 text-sm">
          <li>Copy <code>.env.example</code> to <code>.env.local</code>.</li>
          <li>
            Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, or the newer publishable key.
          </li>
          <li>Run <code>supabase/migrations/001_init.sql</code> in the Supabase SQL editor.</li>
          <li>Restart <code>npm run dev</code>.</li>
        </ol>
      </section>
    </Shell>
  );
}
