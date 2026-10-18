import { literacyTrend, parentCopy, sessionSentence } from "@/lib/create/copy";
import type { SessionMeta } from "@/lib/create/session-meta";

export function CreateParentCard({
  rows,
  unavailable = false,
  open = false,
}: {
  rows: SessionMeta[];
  unavailable?: boolean;
  open?: boolean;
}) {
  const sentences = rows.map((row) => sessionSentence(row));
  const trend = literacyTrend(rows);
  return (
    <details className="create-parent" open={open}>
      <summary>{parentCopy.cardTitle}</summary>
      <div className="create-parent-body">
        {unavailable ? <p>{parentCopy.unavailable}</p> : null}
        {!unavailable && sentences.length === 0 ? <p>{parentCopy.empty}</p> : null}
        {sentences.map((sentence) => (
          <p key={sentence}>{sentence}</p>
        ))}
        {!unavailable && rows.length > 0 ? <p>{trend}</p> : null}
      </div>
    </details>
  );
}
