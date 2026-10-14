import { openSkill } from "@/lib/practice/actions";

export function NeedsReview({
  childId,
  items,
}: {
  childId: string;
  items: { skillId: string; title: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="needs-review" aria-label="Needs review">
      <h3>Needs review</h3>
      <ul>
        {items.map((item) => (
          <li key={item.skillId}>
            <span>{item.title}</span>
            <form action={openSkill}>
              <input type="hidden" name="childId" value={childId} />
              <input type="hidden" name="skillId" value={item.skillId} />
              <button className="btn btn-secondary" type="submit" aria-label={`Review ${item.title}`}>
                Review
              </button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
