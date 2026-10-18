import { ContentAdmin } from "@/components/content-admin";
import { Shell } from "@/components/site-header";
import { SAMPLE_FLAGS, SAMPLE_ITEMS } from "@/lib/content/samples";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Content review sample",
};

export default function ContentAdminPreviewPage() {
  return (
    <Shell role="parent" homeHref="/preview/content-admin">
      <ContentAdmin items={SAMPLE_ITEMS} flags={SAMPLE_FLAGS} preview />
    </Shell>
  );
}
