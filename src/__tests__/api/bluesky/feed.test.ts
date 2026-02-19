import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeJsonRequest, readJson } from "../../helpers/request";

const { mockLogin, mockGetAuthorFeed } = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockGetAuthorFeed: vi.fn(),
}));

vi.mock("@atproto/api", () => ({
  BskyAgent: vi.fn(function () {
    return {
      login: mockLogin,
      getAuthorFeed: mockGetAuthorFeed,
      session: { did: "did:plc:alice" },
    };
  }),
}));

const { POST } = await import("@/app/api/bluesky/feed/route");

const SAMPLE_FEED = {
  data: {
    feed: [
      {
        post: {
          author: { did: "did:plc:alice" },
          uri: "at://did:plc:alice/app.bsky.feed.post/abc",
          record: { text: "My first post" },
          likeCount: 42,
          repostCount: 10,
          replyCount: 5,
          indexedAt: "2024-01-15T10:00:00Z",
        },
      },
      {
        // Post by someone else — must be filtered out
        post: {
          author: { did: "did:plc:other" },
          uri: "at://did:plc:other/app.bsky.feed.post/xyz",
          record: { text: "Someone else's post" },
          likeCount: 0,
          repostCount: 0,
          replyCount: 0,
          indexedAt: "2024-01-15T09:00:00Z",
        },
      },
    ],
  },
};

describe("POST /api/bluesky/feed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogin.mockResolvedValue(undefined);
    mockGetAuthorFeed.mockResolvedValue(SAMPLE_FEED);
  });

  it("returns only the authenticated user's posts", async () => {
    const req = makeJsonRequest({ handle: "alice.bsky.social", appPassword: "xxxx" });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;

    expect(res.status).toBe(200);
    const posts = body.posts as Array<Record<string, unknown>>;
    expect(posts).toHaveLength(1);
    expect(posts[0].content).toBe("My first post");
  });

  it("maps engagement metrics correctly", async () => {
    const req = makeJsonRequest({ handle: "alice.bsky.social", appPassword: "xxxx" });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;
    const posts = body.posts as Array<Record<string, unknown>>;

    expect(posts[0].likes).toBe(42);
    expect(posts[0].reposts).toBe(10);
    expect(posts[0].replies).toBe(5);
    expect(posts[0].createdAt).toBe("2024-01-15T10:00:00Z");
  });

  it("generates correct bsky.app URL from AT URI", async () => {
    const req = makeJsonRequest({ handle: "alice.bsky.social", appPassword: "xxxx" });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;
    const posts = body.posts as Array<Record<string, unknown>>;

    expect(posts[0].url).toBe("https://bsky.app/profile/alice.bsky.social/post/abc");
  });

  it("returns empty posts array when feed is empty", async () => {
    mockGetAuthorFeed.mockResolvedValueOnce({ data: { feed: [] } });

    const req = makeJsonRequest({ handle: "alice.bsky.social", appPassword: "xxxx" });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect((body.posts as unknown[]).length).toBe(0);
  });

  it("returns 400 when login fails", async () => {
    mockLogin.mockRejectedValueOnce(new Error("Invalid credentials"));

    const req = makeJsonRequest({ handle: "alice.bsky.social", appPassword: "bad" });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid credentials");
  });

  it("defaults missing counts to 0", async () => {
    mockGetAuthorFeed.mockResolvedValueOnce({
      data: {
        feed: [
          {
            post: {
              author: { did: "did:plc:alice" },
              uri: "at://did:plc:alice/app.bsky.feed.post/rkey1",
              record: { text: "Post with no counts" },
              indexedAt: "2024-01-01T00:00:00Z",
            },
          },
        ],
      },
    });

    const req = makeJsonRequest({ handle: "alice.bsky.social", appPassword: "xxxx" });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;
    const posts = body.posts as Array<Record<string, unknown>>;

    expect(posts[0].likes).toBe(0);
    expect(posts[0].reposts).toBe(0);
    expect(posts[0].replies).toBe(0);
  });
});
