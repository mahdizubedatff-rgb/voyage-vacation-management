import { useState } from "react";
import clsx from "clsx";
import { ImageOff } from "lucide-react";

/** Image with a shimmer placeholder while loading and a graceful fallback if the file is missing. */
export function VacationImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  return (
    <div className={clsx("relative overflow-hidden bg-sand", className)}>
      {status === "loading" && <div className="skeleton absolute inset-0" aria-hidden />}
      {status === "error" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-sand to-ocean-soft text-muted">
          <ImageOff className="size-7" aria-hidden />
          <span className="text-xs">Image unavailable</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          className={clsx(
            "absolute inset-0 size-full object-cover transition-[opacity,transform] duration-700 ease-out",
            status === "loaded" ? "opacity-100" : "opacity-0",
          )}
        />
      )}
    </div>
  );
}
