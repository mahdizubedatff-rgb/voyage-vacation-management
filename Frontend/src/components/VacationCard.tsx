import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import clsx from "clsx";
import { CalendarDays, Heart, Moon, Pencil, Trash2 } from "lucide-react";
import type { Vacation } from "../types";
import { formatDateRange, formatPrice, nightsBetween, tripStatus } from "../utils/format";
import { LikeButton } from "./LikeButton";
import { VacationImage } from "./VacationImage";
import { buttonClasses } from "./ui/Button";

const STATUS_STYLES = {
  upcoming: { label: "Upcoming", className: "bg-white/90 text-ink" },
  active: { label: "Happening now", className: "bg-ocean text-white" },
  past: { label: "Completed", className: "bg-midnight/75 text-white/90" },
} as const;

interface VacationCardProps {
  vacation: Vacation;
  index?: number;
  mode: "user" | "admin";
  likePending?: boolean;
  onToggleLike?: (vacation: Vacation) => void;
  onDelete?: (vacation: Vacation) => void;
}

export function VacationCard({ vacation, index = 0, mode, likePending, onToggleLike, onDelete }: VacationCardProps) {
  const reduceMotion = useReducedMotion();
  const status = STATUS_STYLES[tripStatus(vacation.startDate, vacation.endDate)];
  const nights = nightsBetween(vacation.startDate, vacation.endDate);
  const [place, ...rest] = vacation.destination.split(",");
  const region = rest.join(",").trim();

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index, 8) * 0.04, ease: "easeOut" }}
      className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-line/70 bg-white shadow-card transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-lift"
      aria-labelledby={`vacation-${vacation.id}-title`}
    >
      <div className="relative">
        <VacationImage
          src={vacation.imageUrl}
          alt={`${vacation.destination}`}
          className="aspect-[4/3] [&_img]:group-hover:scale-[1.04]"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-midnight/35 to-transparent" aria-hidden />
        <span className={clsx("absolute top-4 left-4 rounded-full px-3 py-1 text-xs font-semibold tracking-wide shadow-sm backdrop-blur", status.className)}>
          {status.label}
        </span>
        <div className="absolute top-3 right-3">
          {mode === "user" && onToggleLike ? (
            <LikeButton
              liked={vacation.isLiked}
              count={vacation.likesCount}
              destination={vacation.destination}
              pending={likePending}
              onToggle={() => onToggleLike(vacation)}
            />
          ) : (
            <span
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white/90 px-3.5 text-sm font-semibold text-ink shadow-sm backdrop-blur"
              aria-label={`${vacation.likesCount} likes`}
            >
              <Heart className="size-4 fill-heart stroke-heart" aria-hidden />
              <span className="tabular-nums">{vacation.likesCount}</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="mb-3">
          <h3 id={`vacation-${vacation.id}-title`} className="font-display text-[1.45rem] leading-snug text-ink">
            {place}
          </h3>
          {region && <p className="text-sm font-medium tracking-wide text-gold-deep">{region}</p>}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4 text-ocean" aria-hidden />
            {formatDateRange(vacation.startDate, vacation.endDate)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Moon className="size-4 text-ocean" aria-hidden />
            {nights} {nights === 1 ? "night" : "nights"}
          </span>
        </div>

        <p className="line-clamp-3 flex-1 text-[0.95rem] leading-relaxed text-muted">{vacation.description}</p>

        <div className="mt-6 flex items-end justify-between gap-4 border-t border-line/80 pt-5">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted uppercase">From</p>
            <p className="font-display text-[1.75rem] leading-none whitespace-nowrap text-ink">
              {formatPrice(vacation.price)}
              <span className="ml-1 font-sans text-sm font-normal text-muted">/ person</span>
            </p>
          </div>
          {mode === "admin" && (
            <div className="flex gap-2">
              <Link
                to={`/admin/vacations/${vacation.id}/edit`}
                className={buttonClasses("secondary", "sm", "px-3.5")}
                aria-label={`Edit ${vacation.destination}`}
              >
                <Pencil className="size-4" aria-hidden />
                <span className="hidden xl:inline">Edit</span>
              </Link>
              <button
                type="button"
                onClick={() => onDelete?.(vacation)}
                className={buttonClasses("secondary", "sm", "px-3 text-danger hover:border-danger/40 hover:bg-danger-soft")}
                aria-label={`Delete ${vacation.destination}`}
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}

export function VacationCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-line/70 bg-white shadow-card" aria-hidden>
      <div className="skeleton aspect-[4/3]" />
      <div className="space-y-3 p-6">
        <div className="skeleton h-6 w-2/3 rounded-md" />
        <div className="skeleton h-4 w-1/3 rounded-md" />
        <div className="skeleton h-4 w-full rounded-md" />
        <div className="skeleton h-4 w-5/6 rounded-md" />
        <div className="skeleton mt-6 h-8 w-1/3 rounded-md" />
      </div>
    </div>
  );
}
