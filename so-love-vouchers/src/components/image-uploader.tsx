import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X, ImageIcon, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ImageUploader({
  value,
  onChange,
  folder,
  shape = "rect",
  label,
  fit = "cover",
}: {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  folder: string;
  shape?: "rect" | "circle";
  label?: string;
  /** "contain" shows the whole image (no cropping) in a shorter block. */
  fit?: "cover" | "contain";
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
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

  if (shape === "circle") {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div
            className={cn(
              "size-28 rounded-full overflow-hidden bg-muted border border-border grid place-items-center",
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
              <UserIcon className="size-10 text-muted-foreground/60" />
            )}
          </div>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute -top-1 -right-1 size-7 rounded-full bg-background border border-border shadow-sm grid place-items-center hover:bg-muted"
              aria-label="Remove image"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="size-3.5 animate-spin mr-2" />
          ) : (
            <Upload className="size-3.5 mr-2" />
          )}
          {value ? "Change photo" : (label ?? "Upload photo")}
        </Button>
      </div>
    );
  }

  const contain = fit === "contain";
  const boxHeight = contain ? "h-28" : "h-40";
  return (
    <div className="space-y-2">
      {value ? (
        <div
          className={cn(
            "relative w-full rounded-lg overflow-hidden border border-border",
            boxHeight,
            contain ? "bg-white" : "bg-muted",
          )}
        >
          <img
            src={previewSrc ?? value}
            alt=""
            onError={onPreviewError}
            className={cn(
              "w-full h-full",
              contain ? "object-contain p-1.5" : "object-cover",
              previewFailed && "opacity-0",
            )}
          />
          {previewFailed && (
            <div className="absolute inset-0 grid place-items-center bg-muted/40 text-center px-3">
              <span className="text-[11px] text-muted-foreground">
                Uploaded — preview still loading. It will show in the app.
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 size-8 rounded-full bg-background/90 border border-border flex items-center justify-center hover:bg-background"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <div
          className={cn(
            "w-full rounded-lg border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center text-muted-foreground",
            boxHeight,
          )}
        >
          <ImageIcon className="size-8 mb-1 opacity-50" />
          <span className="text-xs">{label ?? "No image"}</span>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 className="size-4 animate-spin mr-2" />
        ) : (
          <Upload className="size-4 mr-2" />
        )}
        {value ? "Replace image" : (label ?? "Upload image")}
      </Button>
    </div>
  );
}
