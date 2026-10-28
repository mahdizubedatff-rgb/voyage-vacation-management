import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

export interface Segment<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  label: string;
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Radio-group semantics with roving focus (arrow keys move between options). */
export function SegmentedControl<T extends string>({ label, segments, value, onChange }: SegmentedControlProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + segments.length) % segments.length;
    const segment = segments[next];
    if (!segment) return;
    onChange(segment.value);
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={label} className="w-full sm:w-auto">
      <div className="grid grid-cols-2 gap-1 rounded-2xl border border-line bg-white p-1 shadow-card sm:inline-flex sm:rounded-full">
        {segments.map((segment, index) => {
          const active = segment.value === value;
          return (
            <button
              key={segment.value}
              ref={(element) => {
                refs.current[index] = element;
              }}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(segment.value)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={clsx(
                "relative inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium whitespace-nowrap transition-colors sm:rounded-full sm:px-4",
                // An odd last option spans the full row of the mobile grid.
                segments.length % 2 === 1 && index === segments.length - 1 && "col-span-2",
                active ? "text-white" : "text-muted hover:text-ink",
              )}
            >
              {active && (
                <motion.span
                  layoutId={`segment-${label}`}
                  className="absolute inset-0 rounded-xl bg-midnight sm:rounded-full"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                  aria-hidden
                />
              )}
              <span className="relative inline-flex items-center gap-2">
                {segment.icon}
                {segment.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
