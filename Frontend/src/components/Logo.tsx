import clsx from "clsx";

export function Logo({ tone = "dark", className }: { tone?: "dark" | "light"; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <rect width="32" height="32" rx="9" fill={tone === "dark" ? "#0B172A" : "#ffffff"} />
        <path d="M9 10.5l7 12.5 7-12.5" fill="none" stroke="#C8A96B" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="16" cy="9.2" r="1.8" fill="#087F8C" />
      </svg>
      <span className={clsx("font-display text-[1.45rem] font-semibold tracking-tight", tone === "dark" ? "text-ink" : "text-white")}>
        Voyage
      </span>
    </span>
  );
}
