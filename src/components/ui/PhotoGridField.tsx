"use client";

import { useRef } from "react";
import { ImagePlus, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { fileToDataUrl } from "@/lib/utils";

interface PhotoGridFieldProps {
  label: string;
  hint?: string;
  photos: string[];
  onChange: (photos: string[]) => void;
  emptyLabel?: string;
}

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name);
}

/** Multi-image picker with thumbnails — used for property photos. */
export function PhotoGridField({
  label,
  hint,
  photos,
  onChange,
  emptyLabel = "העלאת תמונות",
}: PhotoGridFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = async (files: File[]) => {
    const images = files.filter(isImageFile);
    if (!images.length) return;
    const urls = await Promise.all(images.map(fileToDataUrl));
    onChange([...photos, ...urls]);
  };

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-navy">{label}</p>
        {hint && <p className="text-[0.7rem] text-text-muted">{hint}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          await addFiles(files);
        }}
      />
      {photos.length === 0 ? (
        <Button type="button" variant="outline" fullWidth onClick={() => inputRef.current?.click()}>
          <Upload className="h-5 w-5" />
          {emptyLabel}
        </Button>
      ) : (
        <div className="flex flex-wrap gap-2">
          {photos.map((src, i) => (
            <div key={`${i}-${src.slice(-24)}`} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-16 w-16 rounded-lg object-cover" />
              <button
                type="button"
                onClick={() => onChange(photos.filter((_, idx) => idx !== i))}
                className="absolute -end-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-navy text-white"
                aria-label="הסרת תמונה"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="grid h-16 w-16 place-items-center rounded-lg border border-dashed border-border text-text-muted"
            aria-label="הוספת תמונה"
          >
            <ImagePlus className="h-6 w-6" />
          </button>
        </div>
      )}
    </div>
  );
}
