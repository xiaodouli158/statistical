import type { PropsWithChildren, ReactNode } from "react";

type PanelProps = PropsWithChildren<{
  title?: string;
  action?: ReactNode;
}>;

export function Panel({ title, action, children }: PanelProps) {
  return (
    <section className="panel">
      {(title || action) && (
        <header className="panel__header">
          {title ? <h2>{title}</h2> : <span />}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
