export function contentFlagsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_CONTENT_FLAGS === "1";
}
