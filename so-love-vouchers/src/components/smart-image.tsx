import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Robust image: shows a shimmer skeleton while loading, fades in when ready,
 * and falls back to a branded placeholder if the URL is missing or fails to
 * load (instead of a broken-image icon). Use `wrapperClassName` for the box
 * shape (e.g. aspect ratio) and `className` for the <img> itself.
 */
export function SmartImage({
  src,
  alt,
  className,
  wrapperClassName,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  wrapperClassName?: string;
}) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(src ? "loading" : "error");

  // Reset when the source changes (e.g. realtime update swaps the image).
  useEffect(() => {
    setStatus(src ? "loading" : "error");
  }, [src]);

  return (
    <div className={cn("relative bg-muted overflow-hidden", wrapperClassName)}>
      {src && status !== "error" && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          className={cn(
            "size-full object-cover transition-opacity duration-500",
            status === "loaded" ? "opacity-100" : "opacity-0",
            className,
          )}
        />
      )}

      {status === "loading" && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted via-muted/60 to-muted" />
      )}

      {status === "error" && (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-primary/15 via-primary/5 to-muted text-primary/30">
          <ImageIcon className="size-10" />
        </div>
      )}
    </div>
  );
}
