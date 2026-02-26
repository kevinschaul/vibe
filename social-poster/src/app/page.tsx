"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar, MobileNav } from "@/components/Navigation";
import { PlatformIcon } from "@/components/PlatformIcon";
import { ThreadEditor, ThreadItem } from "@/components/compose/ThreadEditor";
import {
  PLATFORMS,
  PlatformId,
  AccountCredentials,
  ConnectedAccount,
} from "@/types";
import { loadCredentials, loadAccounts } from "@/lib/store";
import { CheckCircle, XCircle, Loader2, ExternalLink, Copy, AlertCircle } from "lucide-react";

interface PostResult {
  success?: boolean;
  error?: string;
  posts?: { url: string }[];
  url?: string;
}

function newThread(): ThreadItem[] {
  return [{ id: crypto.randomUUID(), content: "", media: [] }];
}

type PlatformState = {
  enabled: boolean;
  synced: boolean; // keep in sync with base content or override
  thread: ThreadItem[];
};

function initPlatformState(): Record<PlatformId, PlatformState> {
  return Object.fromEntries(
    PLATFORMS.map((p) => [
      p.id,
      { enabled: false, synced: true, thread: newThread() },
    ])
  ) as Record<PlatformId, PlatformState>;
}

export default function ComposePage() {
  const [baseContent, setBaseContent] = useState("");
  const [baseThread, setBaseThread] = useState<ThreadItem[]>(newThread());
  const [platformState, setPlatformState] = useState<Record<PlatformId, PlatformState>>(
    initPlatformState()
  );
  const [activePlatform, setActivePlatform] = useState<PlatformId | null>(null);
  const [credentials, setCredentials] = useState<AccountCredentials>({});
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [posting, setPosting] = useState(false);
  const [results, setResults] = useState<Record<string, PostResult> | null>(null);

  useEffect(() => {
    setCredentials(loadCredentials());
    setAccounts(loadAccounts());
  }, []);

  const connectedPlatforms = PLATFORMS.filter((p) => {
    const acc = accounts.find((a) => a.platform === p.id);
    return acc?.connected;
  });

  // Sync base thread to all synced platforms
  const syncBase = useCallback(
    (thread: ThreadItem[]) => {
      setBaseThread(thread);
      setPlatformState((prev) => {
        const next = { ...prev };
        for (const id of Object.keys(next) as PlatformId[]) {
          if (next[id].synced) {
            next[id] = { ...next[id], thread };
          }
        }
        return next;
      });
    },
    []
  );

  function togglePlatform(id: PlatformId) {
    setPlatformState((prev) => ({
      ...prev,
      [id]: { ...prev[id], enabled: !prev[id].enabled },
    }));
    if (!activePlatform) setActivePlatform(id);
  }

  function updatePlatformThread(id: PlatformId, thread: ThreadItem[]) {
    setPlatformState((prev) => ({
      ...prev,
      [id]: { ...prev[id], thread, synced: false },
    }));
  }

  function resetToBase(id: PlatformId) {
    setPlatformState((prev) => ({
      ...prev,
      [id]: { ...prev[id], thread: baseThread, synced: true },
    }));
  }

  const enabledPlatforms = PLATFORMS.filter((p) => platformState[p.id].enabled);

  async function handlePublish() {
    if (enabledPlatforms.length === 0) return;
    setPosting(true);
    setResults(null);

    try {
      // Upload media for each platform
      const publishPayload: Record<string, unknown> = { platforms: {} };
      const platforms = publishPayload.platforms as Record<string, unknown>;

      for (const plat of enabledPlatforms) {
        const state = platformState[plat.id];

        if (plat.id === "bluesky" && credentials.bluesky) {
          const bskyPosts = await Promise.all(
            state.thread.map(async (item) => {
              const imageBlobs = await Promise.all(
                item.media.map(async (m) => {
                  const fd = new FormData();
                  fd.append("handle", credentials.bluesky!.handle);
                  fd.append("appPassword", credentials.bluesky!.appPassword);
                  fd.append("file", m.file);
                  const r = await fetch("/api/bluesky/upload", { method: "POST", body: fd });
                  const data = await r.json();
                  return data.blob;
                })
              );
              return { content: item.content, imageBlobs: imageBlobs.filter(Boolean) };
            })
          );
          platforms.bluesky = {
            enabled: true,
            credentials: credentials.bluesky,
            posts: bskyPosts,
          };
        }

        if (plat.id === "mastodon" && credentials.mastodon) {
          const mastodonPosts = await Promise.all(
            state.thread.map(async (item) => {
              const mediaIds = await Promise.all(
                item.media.map(async (m) => {
                  const fd = new FormData();
                  fd.append("instance", credentials.mastodon!.instance);
                  fd.append("accessToken", credentials.mastodon!.accessToken);
                  fd.append("file", m.file);
                  const r = await fetch("/api/mastodon/upload", { method: "POST", body: fd });
                  const data = await r.json();
                  return data.mediaId as string;
                })
              );
              return { content: item.content, mediaIds: mediaIds.filter(Boolean) };
            })
          );
          platforms.mastodon = {
            enabled: true,
            credentials: credentials.mastodon,
            posts: mastodonPosts,
          };
        }

        if (plat.id === "twitter" && credentials.twitter) {
          const twitterPosts = state.thread.map((item) => ({
            content: item.content,
            // Twitter v2 media uploads require separate v1.1 endpoint; simplified here
          }));
          platforms.twitter = {
            enabled: true,
            credentials: credentials.twitter,
            posts: twitterPosts,
          };
        }

      }

      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(publishPayload),
      });
      const data = await res.json();
      setResults(data.results);
    } catch (e) {
      console.error(e);
    } finally {
      setPosting(false);
    }
  }

  const currentPlatform = activePlatform || enabledPlatforms[0]?.id || null;
  const currentState = currentPlatform ? platformState[currentPlatform] : null;
  const currentPlatformDef = currentPlatform
    ? PLATFORMS.find((p) => p.id === currentPlatform)!
    : null;

  const allEmpty = baseThread.every((t) => !t.content.trim());

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <MobileNav />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Compose</h1>
              <p className="text-sm text-zinc-500 mt-1">
                Write once, customize per platform
              </p>
            </div>

            {connectedPlatforms.length === 0 && (
              <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-4 text-sm text-amber-700 dark:text-amber-300">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>
                  No accounts connected.{" "}
                  <a href="/accounts" className="underline font-medium">
                    Connect accounts
                  </a>{" "}
                  to start posting.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left: Platform selector + editor */}
              <div className="lg:col-span-3 flex flex-col gap-4">
                {/* Platform toggles */}
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                    Post to
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map((p) => {
                      const acc = accounts.find((a) => a.platform === p.id);
                      const connected = acc?.connected;
                      const enabled = platformState[p.id].enabled;
                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            if (!connected) return;
                            togglePlatform(p.id);
                            setActivePlatform(p.id);
                          }}
                          disabled={!connected}
                          title={!connected ? `Connect ${p.name} in Accounts` : undefined}
                          className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium border transition-all ${
                            enabled
                              ? "bg-violet-600 text-white border-violet-600"
                              : connected
                              ? "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-200 dark:border-zinc-700 cursor-not-allowed opacity-60"
                          }`}
                        >
                          <PlatformIcon platform={p.id} size={14} />
                          {p.name}
                          {!connected && (
                            <span className="text-xs">·</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Base / Per-platform tabs */}
                {enabledPlatforms.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1">
                      <button
                        onClick={() => setActivePlatform(null)}
                        className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          activePlatform === null
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                            : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                        }`}
                      >
                        Base
                      </button>
                      {enabledPlatforms.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setActivePlatform(p.id)}
                          className={`flex-shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                            activePlatform === p.id
                              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                              : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                          }`}
                        >
                          <PlatformIcon platform={p.id} size={12} />
                          {p.name}
                          {!platformState[p.id].synced && (
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-500" />
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Editor */}
                    {activePlatform === null ? (
                      // Base editor
                      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
                        <p className="text-xs text-zinc-400 mb-3">
                          Synced to all platforms (you can override per-platform)
                        </p>
                        <ThreadEditor
                          posts={baseThread}
                          onChange={syncBase}
                          charLimit={null}
                          placeholder="What's on your mind?"
                        />
                      </div>
                    ) : (
                      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <PlatformIcon platform={currentPlatform!} size={16} />
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                              {currentPlatformDef?.name} version
                            </span>
                          </div>
                          {currentState && !currentState.synced && (
                            <button
                              onClick={() => resetToBase(currentPlatform!)}
                              className="text-xs text-zinc-400 hover:text-violet-600 transition-colors"
                            >
                              Reset to base
                            </button>
                          )}
                          {currentState?.synced && (
                            <span className="text-xs text-zinc-400">Synced with base</span>
                          )}
                        </div>
                        <ThreadEditor
                          posts={currentState!.thread}
                          onChange={(thread) => updatePlatformThread(currentPlatform!, thread)}
                          charLimit={currentPlatformDef?.charLimit ?? null}
                        />
                      </div>
                    )}
                  </div>
                )}

                {enabledPlatforms.length === 0 && (
                  <div className="rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-700 p-8 text-center text-sm text-zinc-400">
                    Select platforms above to start composing
                  </div>
                )}
              </div>

              {/* Right: Actions + results */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                {/* Publish button */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                    Publish
                  </h3>

                  {enabledPlatforms.length > 0 && (
                    <div className="flex flex-col gap-2 mb-4">
                      {enabledPlatforms.map((p) => {
                        const acc = accounts.find((a) => a.platform === p.id);
                        return (
                          <div key={p.id} className="flex items-center gap-2 text-sm">
                            <PlatformIcon platform={p.id} size={14} />
                            <span className="text-zinc-600 dark:text-zinc-400 truncate">
                              {acc?.handle || p.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <button
                    onClick={handlePublish}
                    disabled={posting || enabledPlatforms.length === 0 || allEmpty}
                    className="w-full rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    {posting && <Loader2 size={16} className="animate-spin" />}
                    {posting ? "Publishing..." : "Publish now"}
                  </button>

                  {enabledPlatforms.length === 0 && (
                    <p className="text-xs text-zinc-400 mt-2 text-center">
                      Select at least one platform
                    </p>
                  )}
                </div>

                {/* Results */}
                {results && (
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                      Results
                    </h3>
                    <div className="flex flex-col gap-3">
                      {Object.entries(results).map(([platform, result]) => {
                        const platDef = PLATFORMS.find((p) => p.id === platform);
                        const r = result as PostResult;
                        const url = r.posts?.[0]?.url || r.url;
                        return (
                          <div key={platform} className="flex items-start gap-2">
                            {r.success ? (
                              <CheckCircle size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                            ) : (
                              <XCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <PlatformIcon platform={platform as PlatformId} size={12} />
                                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                  {platDef?.name || platform}
                                </span>
                              </div>
                              {r.error && (
                                <p className="text-xs text-red-500 mt-0.5 break-words">{r.error}</p>
                              )}
                              {url && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-violet-600 hover:underline flex items-center gap-1"
                                  >
                                    View post <ExternalLink size={10} />
                                  </a>
                                  <button
                                    onClick={() => navigator.clipboard.writeText(url)}
                                    className="ml-1 text-zinc-400 hover:text-zinc-600"
                                  >
                                    <Copy size={11} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Per-platform character limits */}
                {enabledPlatforms.length > 0 && (
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                      Character limits
                    </h3>
                    <div className="flex flex-col gap-2">
                      {enabledPlatforms
                        .filter((p) => p.charLimit !== null)
                        .map((p) => {
                          const state = platformState[p.id];
                          const totalChars = state.thread.reduce(
                            (sum, t) => sum + t.content.length,
                            0
                          );
                          const maxChars = p.charLimit! * state.thread.length;
                          const pct = Math.min((totalChars / maxChars) * 100, 100);
                          const overLimit = state.thread.some(
                            (t) => t.content.length > p.charLimit!
                          );
                          return (
                            <div key={p.id}>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <div className="flex items-center gap-1.5">
                                  <PlatformIcon platform={p.id} size={12} />
                                  <span className="text-zinc-600 dark:text-zinc-400">
                                    {p.name}
                                  </span>
                                </div>
                                <span
                                  className={overLimit ? "text-red-500 font-semibold" : "text-zinc-400"}
                                >
                                  {totalChars}/{maxChars}
                                </span>
                              </div>
                              <div className="h-1 rounded-full bg-zinc-100 dark:bg-zinc-700 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    overLimit ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-violet-500"
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
