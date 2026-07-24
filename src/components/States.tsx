import type { ComponentType, ReactNode } from "react";
import { AlertCircleIcon, InboxIcon } from "./icons";

type IconComponent = ComponentType<{ size?: number; className?: string }>;

export function EmptyState({
  icon: Icon = InboxIcon,
  title,
  hint,
  children,
}: {
  icon?: IconComponent;
  title: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center py-16 px-4 animate-fade-up">
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-surface border border-border text-muted mb-4">
        <Icon size={24} />
      </div>
      <h2 className="font-semibold text-[15px]">{title}</h2>
      {hint && <p className="text-muted text-sm mt-1.5 max-w-sm">{hint}</p>}
      {children}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center text-center py-16 px-4 animate-fade-up">
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-surface border border-border text-red-400 mb-4">
        <AlertCircleIcon size={24} />
      </div>
      <h2 className="font-semibold text-[15px]">Something went wrong</h2>
      <p className="text-muted text-sm mt-1.5 max-w-sm">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary px-4 py-2 text-sm mt-5">
          Try again
        </button>
      )}
    </div>
  );
}
