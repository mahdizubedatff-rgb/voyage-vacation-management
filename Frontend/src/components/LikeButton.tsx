import { motion, useReducedMotion } from "framer-motion";
import { Heart } from "lucide-react";
import clsx from "clsx";

interface LikeButtonProps {
  liked: boolean;
  count: number;
  destination: string;
  pending?: boolean;
  onToggle: () => void;
}

export function LikeButton({ liked, count, destination, pending, onToggle }: LikeButtonProps) {
  const reduceMotion = useReducedMotion();

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={pending}
      aria-pressed={liked}
      aria-label={liked ? `Remove ${destination} from favourites` : `Add ${destination} to favourites`}
      className={clsx(
        "group/like inline-flex h-10 items-center gap-1.5 rounded-full pr-3.5 pl-3 text-sm font-semibold shadow-sm backdrop-blur-md transition-colors",
        liked ? "bg-white text-heart" : "bg-white/85 text-ink hover:bg-white",
        pending && "cursor-wait",
      )}
    >
      <motion.span
        key={liked ? "on" : "off"}
        initial={reduceMotion ? false : { scale: liked ? 0.6 : 1 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 520, damping: 14 }}
        className="inline-flex"
      >
        <Heart
          className={clsx("size-[18px] transition-colors", liked ? "fill-heart stroke-heart" : "group-hover/like:stroke-heart")}
          aria-hidden
        />
      </motion.span>
      <span className="tabular-nums" aria-live="polite">
        {count}
        <span className="sr-only"> {count === 1 ? "like" : "likes"}</span>
      </span>
    </button>
  );
}
