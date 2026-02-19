import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { makeJsonRequest, readJson } from "../../helpers/request";

const { POST } = await import("@/app/api/mastodon/feed/route");

const ME_RESPONSE = { id: "12345", username: "alice" };

const STATUSES = [
  {
    id: "s1",
    content: "<p>Hello <strong>world</strong>!</p>",
    url: "https://mastodon.social/@alice/s1",
    favourites_count: 30,
    reblogs_count: 8,
    replies_count: 4,
    created_at: "2024-02-01T12:00:00Z",
  },
  {
    id: "s2",
    content: "<p>Another post with <a href='#'>links</a></p>",
    url: "https://mastodon.social/@alice/s2",
    favourites_count: 5,
    reblogs_count: 0,
    replies_count: 1,
    created_at: "2024-02-01T10:00:00Z",
  },
];

describe("POST /api/mastodon/feed", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    let call = 0;
    vi.mocked(fetch).mockImplementation(async () => {
      call++;
      if (call === 1) {
        // First call: verify_credentials
        return { ok: true, json: async () => ME_RESPONSE } as Response;
      }
      // Second call: statuses
      return { ok: true, status: 200, json: async () => STATUSES } as Response;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns stripped posts with engagement metrics", async () => {
    const req = makeJsonRequest({ instance: "mastodon.social", accessToken: "tok" });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;

    expect(res.status).toBe(200);
    const posts = body.posts as Array<Record<string, unknown>>;
    expect(posts).toHaveLength(2);
  });

  it("strips HTML tags from post content", async () => {
    const req = makeJsonRequest({ instance: "mastodon.social", accessToken: "tok" });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;
    const posts = body.posts as Array<Record<string, unknown>>;

    expect(posts[0].content).toBe("Hello world!");
    expect(posts[1].content).toBe("Another post with links");
  });

  it("maps engagement metrics correctly", async () => {
    const req = makeJsonRequest({ instance: "mastodon.social", accessToken: "tok" });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;
    const posts = body.posts as Array<Record<string, unknown>>;

    expect(posts[0].likes).toBe(30);
    expect(posts[0].reposts).toBe(8);
    expect(posts[0].replies).toBe(4);
    expect(posts[0].createdAt).toBe("2024-02-01T12:00:00Z");
    expect(posts[0].url).toBe("https://mastodon.social/@alice/s1");
  });

  it("fetches statuses for the authenticated user's account ID", async () => {
    const req = makeJsonRequest({ instance: "mastodon.social", accessToken: "tok123" });
    await POST(req);

    // Second fetch call should use the account ID from ME response
    const secondCall = vi.mocked(fetch).mock.calls[1];
    expect(secondCall[0]).toContain("/api/v1/accounts/12345/statuses");
    expect((secondCall[1] as RequestInit).headers).toMatchObject({
      Authorization: "Bearer tok123",
    });
  });

  it("returns 400 when statuses fetch fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ME_RESPONSE,
    } as Response);
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({}),
    } as Response);

    const req = makeJsonRequest({ instance: "mastodon.social", accessToken: "tok" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
