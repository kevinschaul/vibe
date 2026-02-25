import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeJsonRequest, readJson } from "../../helpers/request";

const { mockLogin, mockPost, mockDetectFacets } = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockPost: vi.fn(),
  mockDetectFacets: vi.fn(),
}));

vi.mock("@atproto/api", () => ({
  BskyAgent: vi.fn(function () {
    return {
      login: mockLogin,
      post: mockPost,
      session: { did: "did:plc:testuser" },
    };
  }),
  RichText: vi.fn(function ({ text }: { text: string }) {
    return { text, facets: [], detectFacets: mockDetectFacets };
  }),
}));

const { POST } = await import("@/app/api/bluesky/post/route");

describe("POST /api/bluesky/post", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogin.mockResolvedValue(undefined);
    mockPost.mockResolvedValue({
      uri: "at://did:plc:testuser/app.bsky.feed.post/abc123",
      cid: "bafyreid",
    });
    mockDetectFacets.mockResolvedValue(undefined);
  });

  it("posts successfully and returns URL", async () => {
    const req = makeJsonRequest({
      handle: "alice.bsky.social",
      appPassword: "xxxx",
      content: "Hello Bluesky!",
    });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.postId).toBe("at://did:plc:testuser/app.bsky.feed.post/abc123");
    expect(body.url).toBe("https://bsky.app/profile/alice.bsky.social/post/abc123");
  });

  it("detects facets (links/mentions) before posting", async () => {
    const req = makeJsonRequest({
      handle: "alice.bsky.social",
      appPassword: "xxxx",
      content: "Check out https://example.com",
    });
    await POST(req);

    expect(mockDetectFacets).toHaveBeenCalledOnce();
  });

  it("returns 400 when handle is missing", async () => {
    const req = makeJsonRequest({ appPassword: "xxxx", content: "Hello!" });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 when appPassword is missing", async () => {
    const req = makeJsonRequest({ handle: "alice.bsky.social", content: "Hello!" });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 when content is missing", async () => {
    const req = makeJsonRequest({ handle: "alice.bsky.social", appPassword: "xxxx" });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 when the Bluesky API rejects the post", async () => {
    mockPost.mockRejectedValueOnce(new Error("Rate limit exceeded"));

    const req = makeJsonRequest({
      handle: "alice.bsky.social",
      appPassword: "xxxx",
      content: "Hello!",
    });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;

    expect(res.status).toBe(400);
    expect(body.error).toBe("Rate limit exceeded");
  });
});
