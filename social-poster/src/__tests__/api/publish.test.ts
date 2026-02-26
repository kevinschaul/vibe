import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { makeJsonRequest, readJson } from "../helpers/request";

const { POST } = await import("@/app/api/publish/route");

// The publish route makes internal fetch calls to sub-API routes.
// We intercept all outgoing fetch calls and return pre-baked responses.

function makeMockFetch(responses: Map<string, unknown>) {
  return vi.fn().mockImplementation(async (url: string) => {
    for (const [pattern, data] of responses) {
      if (url.includes(pattern)) {
        return { ok: true, status: 200, json: async () => data } as Response;
      }
    }
    // Default: 404
    return { ok: false, status: 404, json: async () => ({ error: "Not found" }) } as Response;
  });
}

describe("POST /api/publish", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const BLUESKY_CREDS = { handle: "alice.bsky.social", appPassword: "xxxx" };
  const MASTODON_CREDS = { instance: "mastodon.social", accessToken: "tok" };
  const TWITTER_CREDS = {
    apiKey: "k",
    apiSecret: "ks",
    accessToken: "at",
    accessTokenSecret: "ats",
  };

  it("fans out to all enabled platforms concurrently", async () => {
    const responses = new Map([
      ["/api/bluesky/thread", { success: true, posts: [{ uri: "at://...", cid: "c", url: "https://bsky.app/..." }] }],
      ["/api/mastodon/thread", { success: true, posts: [{ id: "1", url: "https://mastodon.social/..." }] }],
      ["/api/twitter/thread", { success: true, posts: [{ id: "t1", url: "https://x.com/..." }] }],
    ]);
    vi.stubGlobal("fetch", makeMockFetch(responses));

    const req = makeJsonRequest({
      platforms: {
        bluesky: {
          enabled: true,
          credentials: BLUESKY_CREDS,
          posts: [{ content: "Hello everyone!" }],
        },
        mastodon: {
          enabled: true,
          credentials: MASTODON_CREDS,
          posts: [{ content: "Hello everyone!" }],
        },
        twitter: {
          enabled: true,
          credentials: TWITTER_CREDS,
          posts: [{ content: "Hello everyone!" }],
        },
      },
    });

    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;
    const results = body.results as Record<string, unknown>;

    expect(results.bluesky).toBeDefined();
    expect(results.mastodon).toBeDefined();
    expect(results.twitter).toBeDefined();
  });

  it("only publishes to enabled platforms", async () => {
    const responses = new Map([
      ["/api/bluesky/thread", { success: true, posts: [{ uri: "", cid: "", url: "" }] }],
    ]);
    vi.stubGlobal("fetch", makeMockFetch(responses));

    const req = makeJsonRequest({
      platforms: {
        bluesky: { enabled: true, credentials: BLUESKY_CREDS, posts: [{ content: "Hi" }] },
        mastodon: { enabled: false, credentials: MASTODON_CREDS, posts: [{ content: "Hi" }] },
      },
    });

    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;
    const results = body.results as Record<string, unknown>;

    expect(results.bluesky).toBeDefined();
    expect(results.mastodon).toBeUndefined();
  });

  it("captures errors per platform without failing others", async () => {
    let callCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) => {
        callCount++;
        if (url.includes("bluesky")) {
          return { ok: true, json: async () => ({ success: true, posts: [{ url: "" }] }) } as Response;
        }
        // Simulate network failure for mastodon
        throw new Error("Network error");
      })
    );

    const req = makeJsonRequest({
      platforms: {
        bluesky: { enabled: true, credentials: BLUESKY_CREDS, posts: [{ content: "Hi" }] },
        mastodon: { enabled: true, credentials: MASTODON_CREDS, posts: [{ content: "Hi" }] },
      },
    });

    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;
    const results = body.results as Record<string, unknown>;

    expect(results.bluesky).toBeDefined();
    expect((results.mastodon as Record<string, unknown>).error).toBe("Network error");
  });

  it("skips platforms with no credentials", async () => {
    vi.stubGlobal("fetch", vi.fn());

    const req = makeJsonRequest({
      platforms: {
        bluesky: { enabled: true, credentials: null, posts: [{ content: "Hi" }] },
      },
    });

    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;
    const results = body.results as Record<string, unknown>;

    // No fetch called, no results
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
    expect(Object.keys(results)).toHaveLength(0);
  });

  it("returns empty results when no platforms are enabled", async () => {
    vi.stubGlobal("fetch", vi.fn());

    const req = makeJsonRequest({ platforms: {} });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;

    expect(body.results).toEqual({});
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });
});
