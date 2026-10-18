import Link from "next/link";

export function SubjectTiles({
  createHref,
  practiceHref = "#practice-skills",
}: {
  createHref: string;
  practiceHref?: string;
}) {
  return (
    <div className="create-tiles">
      <Link href={practiceHref} className="create-tile is-primary">
        <span className="create-tile-kicker">Start here</span>
        <span className="create-tile-title">Practice</span>
        <span className="hint">Keep working on math.</span>
      </Link>
      <Link href={createHref} className="create-tile">
        <span className="create-tile-kicker">When you want to make</span>
        <span className="create-tile-title">Create</span>
        <span className="hint">You decide. The computer helps.</span>
      </Link>
    </div>
  );
}
