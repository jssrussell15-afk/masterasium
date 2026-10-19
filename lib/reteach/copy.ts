/** Parent lines for a re-teach. Edit them here. */

export function returnedLine(plainSkill: string): string {
  return `We took a quick step back to ${plainSkill}, then picked up where we left off.`;
}

export function needsReviewLine(plainSkill: string): string {
  const name = plainSkill.length > 0 ? plainSkill.charAt(0).toUpperCase() + plainSkill.slice(1) : plainSkill;
  return `${name} needs a bit more practice. We've added it to review.`;
}
