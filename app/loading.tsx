import { CalmState } from "@/components/calm-state";
import { Shell } from "@/components/site-header";

export default function Loading() {
  return (
    <Shell narrow>
      <CalmState kind="loading" title="Getting things ready">
        This will only take a moment.
      </CalmState>
    </Shell>
  );
}
