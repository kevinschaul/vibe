"use client";

import { MediaUpload, MediaFile } from "./MediaUpload";

export interface BlogPost {
  title: string;
  content: string;
  slug: string;
  tags: string;
  media: MediaFile[];
}

interface BlogEditorProps {
  post: BlogPost;
  onChange: (post: BlogPost) => void;
}

export function BlogEditor({ post, onChange }: BlogEditorProps) {
  function update(patch: Partial<BlogPost>) {
    onChange({ ...post, ...patch });
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <input
          type="text"
          placeholder="Post title"
          value={post.title}
          onChange={(e) => update({ title: e.target.value })}
          className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 px-3 py-2 text-base font-semibold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none focus:border-violet-400 dark:focus:border-violet-600 transition-colors"
        />
      </div>

      <div>
        <input
          type="text"
          placeholder="slug (auto-generated if blank)"
          value={post.slug}
          onChange={(e) => update({ slug: e.target.value })}
          className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 px-3 py-2 text-sm font-mono text-zinc-600 dark:text-zinc-400 placeholder:text-zinc-400 outline-none focus:border-violet-400 dark:focus:border-violet-600 transition-colors"
        />
      </div>

      <div>
        <textarea
          placeholder="Write your post content here... (supports HTML)"
          value={post.content}
          onChange={(e) => update({ content: e.target.value })}
          rows={10}
          className="w-full resize-y rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none focus:border-violet-400 dark:focus:border-violet-600 transition-colors"
        />
      </div>

      <div>
        <input
          type="text"
          placeholder="Tags (comma separated)"
          value={post.tags}
          onChange={(e) => update({ tags: e.target.value })}
          className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 placeholder:text-zinc-400 outline-none focus:border-violet-400 dark:focus:border-violet-600 transition-colors"
        />
      </div>

      <div>
        <p className="text-xs text-zinc-500 mb-1.5">Featured image</p>
        <MediaUpload files={post.media} onChange={(media) => update({ media })} max={1} />
      </div>
    </div>
  );
}
