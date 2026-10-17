import type { ReactNode } from "react";

export function DashboardWidget({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children?: ReactNode;
}) {
  return (
    <section className="card dash-widget" aria-label={title}>
      <h2>{title}</h2>
      {children ? <div className="dash-widget-list">{children}</div> : <p className="hint">{empty}</p>}
    </section>
  );
}
