"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar, MobileNav } from "@/components/Navigation";
import { PlatformIcon } from "@/components/PlatformIcon";
import {
  PLATFORMS,
  PlatformId,
  AccountCredentials,
  ConnectedAccount,
  RecentPost,
} from "@/types";
import { loadCredentials, loadAccounts } from "@/lib/store";
import {
  Users,
  Heart,
  Repeat2,
  MessageCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PlatformAnalytics {
  platform: PlatformId;
  followers: number;
  following: number;
  posts: number;
  recentPosts: RecentPost[];
  totalLikes: number;
  totalReposts: number;
  totalReplies: number;
  loading: boolean;
  error?: string;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "text-violet-600",
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className={color} />
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {sub && <div className="text-xs text-zinc-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function PostCard({ post }: { post: RecentPost }) {
  return (
    <div className="flex gap-3 py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <PlatformIcon platform={post.platform} size={14} className="flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-800 dark:text-zinc-200 line-clamp-2">{post.content}</p>
        <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-400">
          <span className="flex items-center gap-1">
            <Heart size={11} /> {post.likes.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <Repeat2 size={11} /> {post.reposts.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle size={11} /> {post.replies.toLocaleString()}
          </span>
          <span className="ml-auto">
            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
          </span>
          {post.url && (
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-500 hover:text-violet-700"
            >
              <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function PlatformAnalyticsSection({
  analytics,
}: {
  analytics: PlatformAnalytics;
}) {
  const platform = PLATFORMS.find((p) => p.id === analytics.platform)!;
  const engagement =
    analytics.recentPosts.length > 0
      ? Math.round(
          (analytics.totalLikes + analytics.totalReposts + analytics.totalReplies) /
            analytics.recentPosts.length
        )
      : 0;

  if (analytics.loading) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-zinc-400" />
      </div>
    );
  }

  if (analytics.error) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
        <div className="flex items-center gap-2 mb-1">
          <PlatformIcon platform={analytics.platform} size={16} withBg />
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{platform.name}</span>
        </div>
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle size={12} /> {analytics.error}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-zinc-100 dark:border-zinc-800">
        <PlatformIcon platform={analytics.platform} size={20} withBg />
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{platform.name}</h3>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-zinc-100 dark:divide-zinc-800">
        <div className="p-4">
          <div className="text-xs text-zinc-400 mb-1 flex items-center gap-1">
            <Users size={11} /> Followers
          </div>
          <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {analytics.followers.toLocaleString()}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-zinc-400 mb-1 flex items-center gap-1">
            <Heart size={11} /> Likes
          </div>
          <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {analytics.totalLikes.toLocaleString()}
          </div>
          <div className="text-xs text-zinc-400">last 20 posts</div>
        </div>
        <div className="p-4">
          <div className="text-xs text-zinc-400 mb-1 flex items-center gap-1">
            <Repeat2 size={11} /> Boosts
          </div>
          <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {analytics.totalReposts.toLocaleString()}
          </div>
          <div className="text-xs text-zinc-400">last 20 posts</div>
        </div>
        <div className="p-4">
          <div className="text-xs text-zinc-400 mb-1 flex items-center gap-1">
            <TrendingUp size={11} /> Avg/post
          </div>
          <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {engagement.toLocaleString()}
          </div>
          <div className="text-xs text-zinc-400">interactions</div>
        </div>
      </div>

      {/* Recent posts */}
      {analytics.recentPosts.length > 0 && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 py-2">
          <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide py-2">
            Recent Posts
          </h4>
          {analytics.recentPosts.slice(0, 5).map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const [credentials, setCredentials] = useState<AccountCredentials>({});
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [analytics, setAnalytics] = useState<Record<PlatformId, PlatformAnalytics>>(
    {} as Record<PlatformId, PlatformAnalytics>
  );
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const creds = loadCredentials();
    const accts = loadAccounts();
    setCredentials(creds);
    setAccounts(accts);
  }, []);

  const connectedPlatforms = PLATFORMS.filter((p) =>
    accounts.find((a) => a.platform === p.id && a.connected)
  );

  const fetchAnalytics = useCallback(async () => {
    setRefreshing(true);

    // Init loading state
    const init = {} as Record<PlatformId, PlatformAnalytics>;
    for (const p of connectedPlatforms) {
      init[p.id] = {
        platform: p.id,
        followers: 0,
        following: 0,
        posts: 0,
        recentPosts: [],
        totalLikes: 0,
        totalReposts: 0,
        totalReplies: 0,
        loading: true,
      };
    }
    setAnalytics(init);

    await Promise.all(
      connectedPlatforms.map(async (p) => {
        try {
          let profileData: { followers: number; following: number; posts: number };
          let feedData: RecentPost[] = [];

          if (p.id === "bluesky" && credentials.bluesky) {
            const [profileRes, feedRes] = await Promise.all([
              fetch("/api/bluesky/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(credentials.bluesky),
              }),
              fetch("/api/bluesky/feed", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(credentials.bluesky),
              }),
            ]);

            profileData = await profileRes.json();
            const feedJson = await feedRes.json();
            feedData = (feedJson.posts || []).map((post: {
              id: string;
              content: string;
              url?: string;
              likes: number;
              reposts: number;
              replies: number;
              createdAt: string;
            }) => ({ ...post, platform: "bluesky" as PlatformId }));
          } else if (p.id === "mastodon" && credentials.mastodon) {
            const [profileRes, feedRes] = await Promise.all([
              fetch("/api/mastodon/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(credentials.mastodon),
              }),
              fetch("/api/mastodon/feed", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(credentials.mastodon),
              }),
            ]);

            profileData = await profileRes.json();
            const feedJson = await feedRes.json();
            feedData = (feedJson.posts || []).map((post: {
              id: string;
              content: string;
              url?: string;
              likes: number;
              reposts: number;
              replies: number;
              createdAt: string;
            }) => ({ ...post, platform: "mastodon" as PlatformId }));
          } else if (p.id === "twitter" && credentials.twitter) {
            const profileRes = await fetch("/api/twitter/profile", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(credentials.twitter),
            });
            profileData = await profileRes.json();
            // Twitter feed requires elevated access; show empty for now
            feedData = [];
          } else {
            profileData = { followers: 0, following: 0, posts: 0 };
          }

          const totalLikes = feedData.reduce((s, p) => s + p.likes, 0);
          const totalReposts = feedData.reduce((s, p) => s + p.reposts, 0);
          const totalReplies = feedData.reduce((s, p) => s + p.replies, 0);

          setAnalytics((prev) => ({
            ...prev,
            [p.id]: {
              platform: p.id,
              followers: profileData.followers,
              following: profileData.following,
              posts: profileData.posts,
              recentPosts: feedData,
              totalLikes,
              totalReposts,
              totalReplies,
              loading: false,
            },
          }));
        } catch (e) {
          setAnalytics((prev) => ({
            ...prev,
            [p.id]: {
              ...(prev[p.id] || {}),
              loading: false,
              error: e instanceof Error ? e.message : "Failed to fetch",
            } as PlatformAnalytics,
          }));
        }
      })
    );

    setLastRefreshed(new Date());
    setRefreshing(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credentials, accounts]);

  useEffect(() => {
    if (connectedPlatforms.length > 0) {
      fetchAnalytics();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credentials, accounts]);

  const allPosts = Object.values(analytics)
    .flatMap((a) => a.recentPosts || [])
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalFollowers = Object.values(analytics).reduce(
    (sum, a) => sum + (a.followers || 0),
    0
  );
  const totalLikes = Object.values(analytics).reduce(
    (sum, a) => sum + (a.totalLikes || 0),
    0
  );
  const totalEngagement = Object.values(analytics).reduce(
    (sum, a) => sum + (a.totalLikes || 0) + (a.totalReposts || 0) + (a.totalReplies || 0),
    0
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <MobileNav />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Analytics</h1>
                <p className="text-sm text-zinc-500 mt-1">
                  {lastRefreshed
                    ? `Updated ${formatDistanceToNow(lastRefreshed, { addSuffix: true })}`
                    : "Loading..."}
                </p>
              </div>
              {connectedPlatforms.length > 0 && (
                <button
                  onClick={fetchAnalytics}
                  disabled={refreshing}
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                  Refresh
                </button>
              )}
            </div>

            {connectedPlatforms.length === 0 ? (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-4 text-sm text-amber-700 dark:text-amber-300">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>
                  No accounts connected.{" "}
                  <a href="/accounts" className="underline font-medium">
                    Connect accounts
                  </a>{" "}
                  to view analytics.
                </span>
              </div>
            ) : (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                  <StatCard
                    icon={Users}
                    label="Total Followers"
                    value={totalFollowers}
                    sub={`across ${connectedPlatforms.length} platform${connectedPlatforms.length !== 1 ? "s" : ""}`}
                    color="text-violet-600"
                  />
                  <StatCard
                    icon={Heart}
                    label="Likes (recent)"
                    value={totalLikes}
                    sub="last 20 posts/platform"
                    color="text-pink-500"
                  />
                  <StatCard
                    icon={TrendingUp}
                    label="Total Engagement"
                    value={totalEngagement}
                    sub="likes + boosts + replies"
                    color="text-green-500"
                  />
                </div>

                {/* Per-platform sections */}
                <div className="flex flex-col gap-4 mb-6">
                  {connectedPlatforms.map((p) => {
                    const a = analytics[p.id];
                    if (!a) return null;
                    return <PlatformAnalyticsSection key={p.id} analytics={a} />;
                  })}
                </div>

                {/* Combined recent feed */}
                {allPosts.length > 0 && (
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
                    <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                        Recent posts (all platforms)
                      </h3>
                    </div>
                    <div className="px-4">
                      {allPosts.slice(0, 20).map((post) => (
                        <PostCard key={`${post.platform}-${post.id}`} post={post} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
