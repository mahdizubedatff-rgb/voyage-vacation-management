import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import clsx from "clsx";
import { Eye, EyeOff } from "lucide-react";

const controlBase =
  "block w-full rounded-xl border bg-white px-4 text-[0.95rem] text-ink placeholder:text-muted/70 shadow-[inset_0_1px_1px_rgb(20_33_61/0.03)] " +
  "transition-colors duration-150 focus:outline-none focus:ring-4 disabled:bg-sand disabled:text-muted";

const controlState = (invalid: boolean) =>
  invalid
    ? "border-danger/70 focus:border-danger focus:ring-danger/10"
    : "border-line hover:border-ink/25 focus:border-ocean focus:ring-ocean/10";

interface FieldShellProps {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function FieldShell({ id, label, error, hint, children, className }: FieldShellProps) {
  return (
    <div className={clsx("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: ReactNode;
  leading?: ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, leading, className, containerClassName, id, type = "text", ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";

  return (
    <FieldShell id={inputId} label={label} error={error} hint={hint} className={containerClassName}>
      <div className="relative">
        {leading && (
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted">{leading}</span>
        )}
        <input
          ref={ref}
          id={inputId}
          type={isPassword && revealed ? "text" : type}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={clsx(controlBase, controlState(Boolean(error)), "h-12", leading && "pl-11", isPassword && "pr-12", className)}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            className="absolute inset-y-0 right-2 my-auto flex size-9 items-center justify-center rounded-lg text-muted hover:bg-sand hover:text-ink"
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
          >
            {revealed ? <EyeOff className="size-[18px]" aria-hidden /> : <Eye className="size-[18px]" aria-hidden />}
          </button>
        )}
      </div>
    </FieldShell>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: ReactNode;
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, className, containerClassName, id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <FieldShell id={inputId} label={label} error={error} hint={hint} className={containerClassName}>
      <textarea
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={clsx(controlBase, controlState(Boolean(error)), "min-h-32 resize-y py-3 leading-relaxed", className)}
        {...props}
      />
    </FieldShell>
  );
});
