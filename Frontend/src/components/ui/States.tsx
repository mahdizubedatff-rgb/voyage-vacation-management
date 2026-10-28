import type { ReactNode } from "react";
import { AlertTriangle, Compass } from "lucide-react";
import { Button } from "./Button";

export function EmptyState({ title, description, action, icon }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-line bg-white/60 px-6 py-16 text-center">
      <div className="mb-5 flex size-14 items-center justify-center rounded-full bg-gold-soft text-gold-deep">
        {icon ?? <Compass className="size-6" aria-hidden />}
      </div>
      <h3 className="font-display text-2xl text-ink">{title}</h3>
      {description && <p className="mt-2 max-w-md text-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-[var(--radius-card)] border border-danger/20 bg-danger-soft/50 px-6 py-14 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-white text-danger shadow-sm">
        <AlertTriangle className="size-6" aria-hidden />
      </div>
      <h3 className="font-display text-xl text-ink">We hit a snag</h3>
      <p className="mt-2 max-w-md text-muted">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-6" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="font-display text-[2rem] leading-tight text-ink sm:text-[2.6rem]">{title}</h1>
        {description && <p className="mt-3 text-[1.02rem] leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}
