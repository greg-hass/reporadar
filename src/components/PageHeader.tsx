import type { ComponentType, ReactNode } from "react";

interface Props {
  icon: ComponentType<{ size?: number; className?: string }>;
  eyebrow: ReactNode;
  title: ReactNode;
  description: ReactNode;
  actions?: ReactNode;
}

/** Shared tab header: a predictable title block with optional responsive controls. */
export default function PageHeader({ icon: Icon, eyebrow, title, description, actions }: Props) {
  return (
    <header className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Icon size={19} />
        </div>
        <div className="min-w-0">
          <div className="eyebrow !text-[9px]">{eyebrow}</div>
          <h1 className="mt-0.5 font-display text-lg font-bold leading-tight">{title}</h1>
          <p className="mt-0.5 text-xs text-muted">{description}</p>
        </div>
      </div>
      {actions && <div className="w-full min-w-0 sm:w-auto sm:shrink-0">{actions}</div>}
    </header>
  );
}
