import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Page numbers with ellipses, e.g. [1, "…", 4, 5, 6, "…", 12]. */
export function pageItems(current: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current - 1, current, current + 1].filter((p) => p >= 1 && p <= total));
  const sorted = [...pages].sort((a, b) => a - b);
  const result: Array<number | "…"> = [];
  sorted.forEach((page, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined && page - previous > 1) result.push("…");
    result.push(page);
  });
  return result;
}

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  const arrow =
    "inline-flex h-11 items-center gap-1.5 rounded-full border border-line bg-white px-4 text-sm font-medium text-ink transition-colors hover:border-ink/25 disabled:pointer-events-none disabled:opacity-40";

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-2">
      <button type="button" className={arrow} onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
        <ChevronLeft className="size-4" aria-hidden />
        <span className="hidden sm:inline">Previous</span>
      </button>
      <ul className="flex items-center gap-1">
        {pageItems(page, totalPages).map((item, index) =>
          item === "…" ? (
            <li key={`gap-${index}`} className="px-1 text-muted" aria-hidden>
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                onClick={() => onChange(item)}
                aria-current={item === page ? "page" : undefined}
                aria-label={`Page ${item}`}
                className={clsx(
                  "size-11 rounded-full text-sm font-medium transition-colors",
                  item === page ? "bg-midnight text-white" : "text-ink hover:bg-ink/5",
                )}
              >
                {item}
              </button>
            </li>
          ),
        )}
      </ul>
      <button type="button" className={arrow} onClick={() => onChange(page + 1)} disabled={page >= totalPages} aria-label="Next page">
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="size-4" aria-hidden />
      </button>
    </nav>
  );
}
