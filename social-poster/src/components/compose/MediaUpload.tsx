"use client";

import { useRef, useState } from "react";
import { ImagePlus, X, Film } from "lucide-react";

export interface MediaFile {
  file: File;
  previewUrl: string;
  type: "image" | "video" | "gif";
}

interface MediaUploadProps {
  files: MediaFile[];
  onChange: (files: MediaFile[]) => void;
  max?: number;
}

export function MediaUpload({ files, onChange, max = 4 }: MediaUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(incoming: FileList) {
    const valid = Array.from(incoming)
      .filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"))
      .slice(0, max - files.length);

    const newFiles: MediaFile[] = valid.map((f) => ({
      file: f,
      previewUrl: URL.createObjectURL(f),
      type: f.type.startsWith("video/") ? "video" : f.type === "image/gif" ? "gif" : "image",
    }));

    onChange([...files, ...newFiles]);
  }

  function remove(idx: number) {
    const next = files.filter((_, i) => i !== idx);
    URL.revokeObjectURL(files[idx].previewUrl);
    onChange(next);
  }

  return (
    <div>
      {/* Preview grid */}
      {files.length > 0 && (
        <div className={`grid gap-2 mb-2 ${files.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {files.map((f, i) => (
            <div key={i} className="relative rounded-lg overflow-hidden aspect-video bg-zinc-100 dark:bg-zinc-800">
              {f.type === "video" ? (
                <video
                  src={f.previewUrl}
                  className="w-full h-full object-cover"
                  controls={false}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={f.previewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              )}
              {f.type === "video" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Film size={24} className="text-white" />
                </div>
              )}
              <button
                onClick={() => remove(i)}
                className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80 transition-colors"
                aria-label="Remove"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      {files.length < max && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
          }}
          className={`flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm transition-colors ${
            dragging
              ? "border-violet-400 bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400"
              : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-300"
          }`}
        >
          <ImagePlus size={16} />
          <span>Add media {files.length > 0 && `(${files.length}/${max})`}</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
    </div>
  );
}
