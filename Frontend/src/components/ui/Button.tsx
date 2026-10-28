import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import clsx from "clsx";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "dark" | "gold";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-all duration-200 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocean disabled:pointer-events-none disabled:opacity-55 " +
  "active:scale-[0.98] select-none";

const variants: Record<Variant, string> = {
  primary: "bg-ocean text-white shadow-sm hover:bg-ocean-dark hover:shadow-md",
  secondary: "border border-line bg-white text-ink hover:border-ink/25 hover:bg-sand/60",
  ghost: "text-ink hover:bg-ink/5",
  danger: "bg-danger text-white shadow-sm hover:bg-[#9a1d14]",
  dark: "bg-midnight text-white shadow-sm hover:bg-ink",
  gold: "bg-gold text-midnight shadow-sm hover:bg-[#bd9c5b]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-7 text-[0.95rem]",
};

export const buttonClasses = (variant: Variant = "primary", size: Size = "md", className?: string) =>
  clsx(base, variants[variant], sizes[size], className);

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, icon, className, children, disabled, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClasses(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner className="size-4" /> : icon}
      {children}
    </button>
  );
});

interface ButtonLinkProps extends LinkProps {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

export function ButtonLink({ variant = "primary", size = "md", icon, className, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses(variant, size, typeof className === "string" ? className : undefined)} {...props}>
      {icon}
      {children}
    </Link>
  );
}
