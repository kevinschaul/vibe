/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  saveCredentials,
  loadCredentials,
  saveAccounts,
  loadAccounts,
  saveAnalytics,
  loadAnalytics,
  clearAll,
} from "@/lib/store";
import type { AccountCredentials, ConnectedAccount, AnalyticsData, PlatformId } from "@/types";

const BLUESKY_CREDS: AccountCredentials = {
  bluesky: { handle: "alice.bsky.social", appPassword: "xxxx-xxxx-xxxx-xxxx" },
};

const ACCOUNTS: ConnectedAccount[] = [
  {
    platform: "bluesky",
    handle: "@alice.bsky.social",
    displayName: "Alice",
    avatarUrl: "https://cdn.bsky.app/alice.jpg",
    connected: true,
  },
];

const ANALYTICS: Record<PlatformId, AnalyticsData> = {
  bluesky: {
    platform: "bluesky",
    followers: 1000,
    posts: 200,
    likes: 500,
    reposts: 100,
    replies: 50,
    lastUpdated: "2024-01-01T00:00:00Z",
  },
  mastodon: {
    platform: "mastodon",
    followers: 300,
    posts: 80,
    likes: 120,
    reposts: 30,
    replies: 10,
    lastUpdated: "2024-01-01T00:00:00Z",
  },
  twitter: {
    platform: "twitter",
    followers: 5000,
    posts: 1200,
    likes: 3000,
    reposts: 600,
    replies: 200,
    lastUpdated: "2024-01-01T00:00:00Z",
  },
  blog: {
    platform: "blog",
    followers: 0,
    posts: 50,
    likes: 0,
    reposts: 0,
    replies: 0,
    lastUpdated: "2024-01-01T00:00:00Z",
  },
};

describe("lib/store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ─── Credentials ───────────────────────────────────────────────────────────

  describe("credentials", () => {
    it("saves and loads credentials round-trip", () => {
      saveCredentials(BLUESKY_CREDS);
      expect(loadCredentials()).toEqual(BLUESKY_CREDS);
    });

    it("returns empty object when nothing is stored", () => {
      expect(loadCredentials()).toEqual({});
    });

    it("overwrites previous credentials on save", () => {
      saveCredentials(BLUESKY_CREDS);
      saveCredentials({ mastodon: { instance: "mastodon.social", accessToken: "tok" } });
      expect(loadCredentials()).toEqual({
        mastodon: { instance: "mastodon.social", accessToken: "tok" },
      });
    });

    it("handles all four platforms stored at once", () => {
      const allCreds: AccountCredentials = {
        bluesky: { handle: "alice.bsky.social", appPassword: "pass" },
        mastodon: { instance: "mastodon.social", accessToken: "tok" },
        twitter: {
          apiKey: "k",
          apiSecret: "ks",
          accessToken: "at",
          accessTokenSecret: "ats",
          bearerToken: "bt",
        },
        blog: { type: "wordpress", url: "https://myblog.com", username: "admin", password: "pass" },
      };
      saveCredentials(allCreds);
      expect(loadCredentials()).toEqual(allCreds);
    });

    it("returns empty object when localStorage contains invalid JSON", () => {
      localStorage.setItem("vibe_credentials", "{ invalid json");
      expect(loadCredentials()).toEqual({});
    });
  });

  // ─── Accounts ──────────────────────────────────────────────────────────────

  describe("accounts", () => {
    it("saves and loads accounts round-trip", () => {
      saveAccounts(ACCOUNTS);
      expect(loadAccounts()).toEqual(ACCOUNTS);
    });

    it("returns empty array when nothing is stored", () => {
      expect(loadAccounts()).toEqual([]);
    });

    it("overwrites previous accounts on save", () => {
      saveAccounts(ACCOUNTS);
      const newAccounts: ConnectedAccount[] = [
        { platform: "mastodon", handle: "@bob@mastodon.social", displayName: "Bob", connected: true },
      ];
      saveAccounts(newAccounts);
      expect(loadAccounts()).toEqual(newAccounts);
    });

    it("preserves connected: false accounts", () => {
      const disconnected: ConnectedAccount[] = [
        {
          platform: "twitter",
          handle: "@alice",
          displayName: "Alice",
          connected: false,
          error: "Auth failed",
        },
      ];
      saveAccounts(disconnected);
      const loaded = loadAccounts();
      expect(loaded[0].connected).toBe(false);
      expect(loaded[0].error).toBe("Auth failed");
    });

    it("returns empty array when localStorage contains invalid JSON", () => {
      localStorage.setItem("vibe_accounts", "not valid");
      expect(loadAccounts()).toEqual([]);
    });
  });

  // ─── Analytics ─────────────────────────────────────────────────────────────

  describe("analytics", () => {
    it("saves and loads analytics round-trip", () => {
      saveAnalytics(ANALYTICS);
      expect(loadAnalytics()).toEqual(ANALYTICS);
    });

    it("returns empty object when nothing is stored", () => {
      expect(loadAnalytics()).toEqual({});
    });

    it("returns empty object when localStorage contains invalid JSON", () => {
      localStorage.setItem("vibe_analytics", "}broken{");
      expect(loadAnalytics()).toEqual({});
    });
  });

  // ─── clearAll ──────────────────────────────────────────────────────────────

  describe("clearAll", () => {
    it("removes credentials, accounts, and analytics", () => {
      saveCredentials(BLUESKY_CREDS);
      saveAccounts(ACCOUNTS);
      saveAnalytics(ANALYTICS);

      clearAll();

      expect(loadCredentials()).toEqual({});
      expect(loadAccounts()).toEqual([]);
      expect(loadAnalytics()).toEqual({});
    });

    it("is idempotent when called multiple times", () => {
      clearAll();
      clearAll();
      expect(loadCredentials()).toEqual({});
    });

    it("does not affect unrelated localStorage keys", () => {
      localStorage.setItem("my_other_key", "keep-this");
      saveCredentials(BLUESKY_CREDS);
      clearAll();

      expect(localStorage.getItem("my_other_key")).toBe("keep-this");
    });
  });
});
