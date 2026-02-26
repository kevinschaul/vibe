export type PlatformId = "bluesky" | "twitter" | "mastodon";

export interface Platform {
  id: PlatformId;
  name: string;
  color: string;
  charLimit: number | null;
  enabled: boolean;
}

export interface AccountCredentials {
  bluesky?: {
    handle: string;
    appPassword: string;
  };
  twitter?: {
    apiKey: string;
    apiSecret: string;
    accessToken: string;
    accessTokenSecret: string;
    bearerToken: string;
  };
  mastodon?: {
    instance: string;
    accessToken: string;
  };
}

export interface ConnectedAccount {
  platform: PlatformId;
  handle: string;
  displayName: string;
  avatarUrl?: string;
  connected: boolean;
  error?: string;
}

export interface PlatformPost {
  platform: PlatformId;
  content: string;
  enabled: boolean;
  thread?: string[]; // for long-form split into threads
  tags?: string[];
}

export interface PostDraft {
  id: string;
  baseContent: string;
  platforms: Record<PlatformId, PlatformPost>;
  scheduledAt?: string;
  createdAt: string;
}

export interface PostResult {
  platform: PlatformId;
  success: boolean;
  url?: string;
  error?: string;
  postId?: string;
}

export interface AnalyticsData {
  platform: PlatformId;
  followers: number;
  followersChange?: number;
  posts: number;
  likes: number;
  reposts: number;
  replies: number;
  impressions?: number;
  lastUpdated: string;
}

export interface RecentPost {
  id: string;
  platform: PlatformId;
  content: string;
  url?: string;
  likes: number;
  reposts: number;
  replies: number;
  impressions?: number;
  createdAt: string;
}

export const PLATFORMS: Platform[] = [
  {
    id: "bluesky",
    name: "Bluesky",
    color: "#0085ff",
    charLimit: 300,
    enabled: true,
  },
  {
    id: "twitter",
    name: "X (Twitter)",
    color: "#000000",
    charLimit: 280,
    enabled: true,
  },
  {
    id: "mastodon",
    name: "Mastodon",
    color: "#6364ff",
    charLimit: 500,
    enabled: true,
  },
];

export const PLATFORM_MAP = Object.fromEntries(
  PLATFORMS.map((p) => [p.id, p])
) as Record<PlatformId, Platform>;
