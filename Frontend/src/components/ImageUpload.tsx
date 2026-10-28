import { useEffect, useId, useRef, useState } from "react";
import clsx from "clsx";
import { ImagePlus, RefreshCw, X } from "lucide-react";

export const MAX_IMAGE_MB = 5;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

/** Returns an error message for an invalid file, or null. */
export function validateImageFile(file: File): string | null {
  if (!ACCEPTED.includes(file.type)) return "Please choose a JPEG, PNG or WebP image";
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) return `Image must be smaller than ${MAX_IMAGE_MB} MB`;
  return null;
}

interface ImageUploadProps {
  value: File | null;
  onChange: (file: File | null) => void;
  existingUrl?: string;
  error?: string;
  onInvalid: (message: string) => void;
}

export function ImageUpload({ value, onChange, existingUrl, error, onInvalid }: ImageUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);

  // Object URLs are created in event handlers and revoked when replaced or on unmount.
  const replacePreview = (file: File | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = file ? URL.createObjectURL(file) : null;
    setPreview(previewRef.current);
  };

  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  const shown = preview ?? existingUrl;

  const pick = (file: File | undefined) => {
    if (!file) return;
    const problem = validateImageFile(file);
    if (problem) {
      onInvalid(problem);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    replacePreview(file);
    onChange(file);
  };

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium text-ink">
        Cover image
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPTED.join(",")}
        className="sr-only"
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${inputId}-error` : `${inputId}-hint`}
        onChange={(event) => pick(event.target.files?.[0])}
      />

      {shown ? (
        <div className={clsx("group relative overflow-hidden rounded-2xl border bg-sand", error ? "border-danger/60" : "border-line")}>
          <img src={shown} alt="Selected cover preview" className="aspect-[16/10] w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-2 bg-gradient-to-t from-midnight/80 to-transparent p-4 pt-10">
            <span className="truncate text-sm font-medium text-white">{value ? value.name : "Current image"}</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-sm font-medium text-ink hover:bg-gold-soft"
              >
                <RefreshCw className="size-4" aria-hidden />
                Replace
              </button>
              {value && (
                <button
                  type="button"
                  onClick={() => {
                    replacePreview(null);
                    onChange(null);
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                  className="inline-flex size-9 items-center justify-center rounded-full bg-white/90 text-ink hover:bg-white"
                  aria-label="Remove selected image"
                >
                  <X className="size-4" aria-hidden />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={clsx(
            "flex aspect-[16/10] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-white text-center transition-colors",
            error ? "border-danger/50 hover:bg-danger-soft/40" : "border-line hover:border-ocean/50 hover:bg-ocean-soft/40",
          )}
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-ocean-soft text-ocean">
            <ImagePlus className="size-6" aria-hidden />
          </span>
          <span className="font-medium text-ink">Choose a cover image</span>
          <span className="text-sm text-muted">JPEG, PNG or WebP · up to {MAX_IMAGE_MB} MB</span>
        </button>
      )}

      {error ? (
        <p id={`${inputId}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : (
        <p id={`${inputId}-hint`} className="text-sm text-muted">
          {existingUrl && !value ? "Leave as is to keep the current image." : "Landscape photos look best (16:10)."}
        </p>
      )}
    </div>
  );
}
