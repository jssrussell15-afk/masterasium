import type { ReactNode } from "react";

export function CalmState({
  kind,
  title,
  children,
  action,
  heading = "h1",
}: {
  kind: "loading" | "empty" | "error";
  title: string;
  children: ReactNode;
  action?: ReactNode;
  heading?: "h1" | "h2";
}) {
  const Title = heading === "h2" ? "h2" : "h1";
  return (
    <section className={`calm-state calm-${kind}`} role={kind === "error" ? "alert" : "status"}>
      {kind === "loading" ? (
        <p className="calm-loading-mark" aria-hidden="true">
          <span />
        </p>
      ) : null}
      <Title className="display">{title}</Title>
      <p className="calm-copy">{children}</p>
      {action}
    </section>
  );
}
