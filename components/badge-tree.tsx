import type { BadgePiece, BadgePieceName } from "@/lib/practice/badges";

function pieceLabel(piece: BadgePieceName): string {
  if (piece === "helmet") return "Helmet";
  if (piece === "shield") return "Shield";
  if (piece === "boots") return "Boots";
  return "Cape";
}

function BadgeIcon({ piece }: { piece: BadgePieceName }) {
  if (piece === "helmet") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 13 a8 8 0 0 1 16 0 v2 H4 z" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 15 v3 h8 v-3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }
  if (piece === "shield") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 19 6 v6 c0 4.2-3 7.2-7 8.5 C8 19.2 5 16.2 5 12 V6 z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }
  if (piece === "boots") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 4 h3 v9 h5 v3 H5 z M14 8 h3 v6 h3 v3 h-9 v-3 h3 z" fill="none" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 4 h3 l1 4 4 12 H7 L8 4 z" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function BadgeTree({ badges }: { badges: BadgePiece[] }) {
  if (badges.length === 0) return null;
  return (
    <section className="badge-tree" aria-label="Badge tree">
      <h2>Badge tree</h2>
      <ul>
        {badges.map((badge) => (
          <li key={badge.skillId}>
            <BadgeIcon piece={badge.piece} />
            <span>
              <strong>{pieceLabel(badge.piece)}</strong>
              <span>{badge.skillTitle}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
