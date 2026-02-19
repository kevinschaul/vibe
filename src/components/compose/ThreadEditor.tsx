"use client";

import { Plus, Trash2, GripVertical } from "lucide-react";
import { MediaUpload, MediaFile } from "./MediaUpload";

export interface ThreadItem {
  id: string;
  content: string;
  media: MediaFile[];
}

interface ThreadEditorProps {
  posts: ThreadItem[];
  onChange: (posts: ThreadItem[]) => void;
  charLimit: number | null;
  placeholder?: string;
}

function CharCount({ content, limit }: { content: string; limit: number | null }) {
  if (!limit) return null;
  const len = content.length;
  const remaining = limit - len;
  const pct = len / limit;
  return (
    <span
      className={`text-xs tabular-nums ${
        remaining < 0
          ? "text-red-500 font-semibold"
          : remaining <= 20
          ? "text-amber-500"
          : "text-zinc-400"
      }`}
    >
      {remaining}
    </span>
  );
}

export function ThreadEditor({ posts, onChange, charLimit, placeholder }: ThreadEditorProps) {
  function update(id: string, patch: Partial<ThreadItem>) {
    onChange(posts.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function addPost() {
    onChange([
      ...posts,
      { id: crypto.randomUUID(), content: "", media: [] },
    ]);
  }

  function remove(id: string) {
    if (posts.length <= 1) return;
    onChange(posts.filter((p) => p.id !== id));
  }

  return (
    <div className="flex flex-col gap-3">
      {posts.map((post, idx) => {
        const isOver = charLimit !== null && post.content.length > charLimit;
        return (
          <div key={post.id} className="flex gap-2">
            {/* Thread line */}
            <div className="flex flex-col items-center pt-3">
              <div className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-600 flex-shrink-0" />
              {idx < posts.length - 1 && (
                <div className="w-0.5 flex-1 bg-zinc-200 dark:bg-zinc-700 mt-1" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              {posts.length > 1 && (
                <div className="flex items-center gap-1 mb-1">
                  <GripVertical size={14} className="text-zinc-300 dark:text-zinc-600" />
                  <span className="text-xs text-zinc-400">{idx + 1}/{posts.length}</span>
                </div>
              )}

              <div className={`rounded-xl border transition-colors ${
                isOver
                  ? "border-red-300 dark:border-red-700"
                  : "border-zinc-200 dark:border-zinc-700"
              } bg-white dark:bg-zinc-800/50`}>
                <textarea
                  value={post.content}
                  onChange={(e) => update(post.id, { content: e.target.value })}
                  placeholder={placeholder || (idx === 0 ? "What's on your mind?" : "Continue thread...")}
                  rows={3}
                  className="w-full resize-none rounded-t-xl bg-transparent px-3 pt-3 pb-1 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none"
                />
                <div className="px-3 pb-2 pt-1">
                  <MediaUpload
                    files={post.media}
                    onChange={(media) => update(post.id, { media })}
                    max={4}
                  />
                </div>
                <div className="flex items-center justify-between px-3 pb-2">
                  <div className="flex gap-1">
                    {posts.length > 1 && idx > 0 && (
                      <button
                        onClick={() => remove(post.id)}
                        className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950 transition-colors"
                        aria-label="Remove post"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <CharCount content={post.content} limit={charLimit} />
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <div className="ml-4">
        <button
          onClick={addPost}
          className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors font-medium"
        >
          <Plus size={14} />
          Add to thread
        </button>
      </div>
    </div>
  );
}
