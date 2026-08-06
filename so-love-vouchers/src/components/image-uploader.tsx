import { useEffect, useId, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Upload,
  X,
  ImagePlus,
  RefreshCw,
  Trash2,
  User as UserIcon,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

export function ImageUploader({
  value,
  onChange,
  folder,
  shape = "rect",
  label,
  fit = "contain",
  compact = false,
  aspect = "16 / 10",
  hint,
  className,
}: {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  folder: string;
  shape?: "rect" | "circle";
  label?: string;
  /** "contain" (default) shows the whole image — nothing is ever cropped away.
   *  "cover" fills the frame edge-to-edge and is only for deliberate crops. */
  fit?: "cover" | "contain";
  /** Smaller circle avatar with click-to-upload — used for contact people lists. */
  compact?: boolean;
  /** CSS aspect-ratio for the rectangular preview frame, e.g. "16 / 9", "4 / 5". */
  aspect?: string;
  /** Small helper line under the frame. */
  hint?: string;
  className?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  // Right after upload the CDN can lag a moment behind the returned public
  // URL, so a fresh image sometimes 404s on first paint. Retry a few times
  // with a cache-buster before giving up, so the preview always appears.
  const [previewSrc, setPreviewSrc] = useState<string | null | undefined>(value);
  const [previewFailed, setPreviewFailed] = useState(false);
  const retriesRef = useRef(0);
  useEffect(() => {
    setPreviewSrc(value);
    setPreviewFailed(false);
    retriesRef.current = 0;
  }, [value]);

  function onPreviewError() {
    if (!value) return;
    if (retriesRef.current < 4) {
      retriesRef.current += 1;
      const delay = 500 * retriesRef.current;
      setTimeout(() => {
        setPreviewSrc(`${value}${value.includes("?") ? "&" : "?"}r=${Date.now()}`);
      }, delay);
    } else {
      setPreviewFailed(true);
    }
  }

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("That file isn't an image");
      return;
    }
    if (!ACCEPTED.includes(file.type)) {
      // HEIC and friends won't render for every member, so stop them here
      // rather than after they're already in storage.
      toast.error("Use a JPG, PNG, WebP or GIF — other formats don't display everywhere");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(
        `Image must be under 5MB — that one is ${(file.size / 1024 / 1024).toFixed(1)}MB`,
      );
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("media")
      .upload(path, file, { upsert: false, contentType: file.type });
    setUploading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    onChange(data.publicUrl);
    toast.success("Image uploaded");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) await upload(file);
  }

  function pick() {
    inputRef.current?.click();
  }

  const fileInput = (
    <input
      ref={inputRef}
      id={inputId}
      type="file"
      accept="image/*"
      className="sr-only"
      onChange={handleFile}
    />
  );

  /* ---------------------------------------------------------------- circle */

  if (shape === "circle" && compact) {
    return (
      <div className={cn("relative shrink-0", className)}>
        <button
          type="button"
          onClick={pick}
          disabled={uploading}
          aria-label={value ? "Change photo" : (label ?? "Upload photo")}
          className={cn(
            "size-14 rounded-full overflow-hidden bg-muted border border-border grid place-items-center transition-all hover:border-primary/50 hover:shadow-sm",
            !value && "border-dashed",
          )}
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : value ? (
            <img
              src={previewSrc ?? value}
              alt=""
              onError={onPreviewError}
              className="size-full object-cover"
            />
          ) : (
            <Upload className="size-4 text-muted-foreground/70" />
          )}
        </button>
        {value && !uploading && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute -top-1 -right-1 size-5 rounded-full bg-background border border-border shadow-sm grid place-items-center hover:bg-muted"
            aria-label="Remove image"
          >
            <X className="size-3" />
          </button>
        )}
        {fileInput}
      </div>
    );
  }

  if (shape === "circle") {
    return (
      <div className={cn("flex flex-col items-center gap-3", className)}>
        <button
          type="button"
          onClick={pick}
          disabled={uploading}
          aria-label={value ? "Change photo" : (label ?? "Upload photo")}
          className="group relative rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
        >
          <div
            className={cn(
              "size-28 rounded-full overflow-hidden bg-muted border border-border grid place-items-center transition-colors group-hover:border-primary/40",
              !value && "border-dashed",
            )}
          >
            {value ? (
              <img
                src={previewSrc ?? value}
                alt=""
                onError={onPreviewError}
                className="size-full object-cover"
              />
            ) : (
              <UserIcon className="size-10 text-muted-foreground/50" />
            )}
          </div>
          {/* Hover affordance so it's obvious the avatar itself is clickable */}
          <div className="absolute inset-0 rounded-full bg-black/45 grid place-items-center opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="size-6 text-white" />
          </div>
          {uploading && (
            <div className="absolute inset-0 rounded-full bg-background/70 backdrop-blur-[2px] grid place-items-center">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          )}
        </button>
        {fileInput}
        {value && !uploading ? (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-full"
              onClick={pick}
            >
              <RefreshCw className="size-3.5 mr-1.5" /> Change
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-full text-muted-foreground hover:text-destructive"
              onClick={() => onChange(null)}
            >
              <Trash2 className="size-3.5 mr-1.5" /> Remove
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-full px-4"
            onClick={pick}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="size-3.5 animate-spin mr-2" />
            ) : (
              <Upload className="size-3.5 mr-2" />
            )}
            {label ?? "Upload photo"}
          </Button>
        )}
      </div>
    );
  }

  /* ------------------------------------------------------------ rectangle */

  const cover = fit === "cover";

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void upload(file);
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{ aspectRatio: aspect }}
        className={cn(
          "group relative w-full overflow-hidden rounded-2xl border transition-all duration-200",
          value
            ? "border-border/70 bg-muted/30"
            : "border-2 border-dashed border-border bg-muted/25 hover:border-primary/45 hover:bg-primary/[0.04]",
          dragging && "border-primary bg-primary/[0.07] ring-4 ring-primary/15",
        )}
      >
        {value ? (
          <>
            {/* A blurred copy of the image fills the frame so a portrait or
                wide photo never sits in dead grey space — the real image on
                top is always shown whole. */}
            {!cover && !previewFailed && (
              <img
                src={previewSrc ?? value}
                alt=""
                aria-hidden
                onError={onPreviewError}
                className="absolute inset-0 size-full scale-125 object-cover opacity-30 blur-2xl saturate-150"
              />
            )}
            <img
              src={previewSrc ?? value}
              alt=""
              onError={onPreviewError}
              className={cn(
                "relative size-full",
                cover ? "object-cover" : "object-contain p-3",
                previewFailed && "opacity-0",
              )}
            />

            {previewFailed && (
              <div className="absolute inset-0 grid place-items-center bg-muted/50 px-4 text-center">
                <span className="text-[11px] text-muted-foreground">
                  Uploaded — the preview is still loading. It will show in the app.
                </span>
              </div>
            )}

            {/* Floating toolbar: always visible so it works on touch too. */}
            <div className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full border border-border/60 bg-background/85 p-1 shadow-sm backdrop-blur-md">
              <button
                type="button"
                onClick={pick}
                disabled={uploading}
                aria-label="Replace image"
                title="Replace image"
                className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <RefreshCw className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onChange(null)}
                disabled={uploading}
                aria-label="Remove image"
                title="Remove image"
                className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={pick}
            disabled={uploading}
            aria-label={label ?? "Add an image"}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 rounded-2xl"
          >
            <span
              className={cn(
                "grid size-11 place-items-center rounded-full bg-background text-muted-foreground shadow-sm ring-1 ring-border/60 transition-colors group-hover:text-primary",
                dragging && "text-primary",
              )}
            >
              <ImagePlus className="size-5" />
            </span>
            <span className="text-[13px] font-semibold text-foreground">
              {dragging ? "Drop to upload" : (label ?? "Add an image")}
            </span>
            <span className="text-[11px] leading-tight text-muted-foreground">
              Drag &amp; drop, or click to browse
            </span>
          </button>
        )}

        {uploading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/75 backdrop-blur-[2px]">
            <Loader2 className="size-5 animate-spin text-primary" />
            <span className="text-[11px] font-medium text-muted-foreground">Uploading…</span>
          </div>
        )}
      </div>

      {fileInput}

      {hint && <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p>}
    </div>
  );
}
