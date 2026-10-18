export function CurriculumFooter({
  title,
  lastVerified,
  note,
}: {
  title: string;
  lastVerified: string;
  note?: string | null;
}) {
  return (
    <p data-testid="last-verified" className="trust-line">
      Curriculum: {title}. Last verified {lastVerified}.
      {note ? ` ${note}` : null}
    </p>
  );
}
