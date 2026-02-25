import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeJsonRequest, readJson } from "../../helpers/request";

const { mockLogin, mockDetectFacets } = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockDetectFacets: vi.fn(),
}));

// mockPost needs to be per-test (counter resets), so hoist it and re-impl in beforeEach
const { mockPost } = vi.hoisted(() => ({ mockPost: vi.fn() }));

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

const { POST } = await import("@/app/api/bluesky/thread/route");

describe("POST /api/bluesky/thread", () => {
  let callCount = 0;

  beforeEach(() => {
    vi.clearAllMocks();
    callCount = 0;
    mockLogin.mockResolvedValue(undefined);
    mockDetectFacets.mockResolvedValue(undefined);
    mockPost.mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        uri: `at://did:plc:testuser/app.bsky.feed.post/rkey${callCount}`,
        cid: `cid${callCount}`,
      });
    });
  });

  it("posts a single-post thread and returns URL", async () => {
    const req = makeJsonRequest({
      handle: "alice.bsky.social",
      appPassword: "xxxx",
      posts: [{ content: "First and only post" }],
    });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    const posts = body.posts as Array<Record<string, unknown>>;
    expect(posts).toHaveLength(1);
    expect(posts[0].url).toContain("bsky.app/profile/alice.bsky.social/post/rkey1");
    expect(mockPost).toHaveBeenCalledOnce();
  });

  it("posts a multi-post thread with correct reply references", async () => {
    const req = makeJsonRequest({
      handle: "alice.bsky.social",
      appPassword: "xxxx",
      posts: [
        { content: "Post 1 of 3" },
        { content: "Post 2 of 3" },
        { content: "Post 3 of 3" },
      ],
    });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect((body.posts as unknown[]).length).toBe(3);
    expect(mockPost).toHaveBeenCalledTimes(3);

    // Second post: reply.root and reply.parent both point to first
    const secondArgs = mockPost.mock.calls[1][0] as Record<string, unknown>;
    expect(secondArgs.reply).toBeDefined();
    const reply = secondArgs.reply as Record<string, unknown>;
    expect((reply.root as Record<string, string>).uri).toContain("rkey1");
    expect((reply.parent as Record<string, string>).uri).toContain("rkey1");

    // Third post: reply.root = first, reply.parent = second
    const thirdArgs = mockPost.mock.calls[2][0] as Record<string, unknown>;
    const thirdReply = thirdArgs.reply as Record<string, unknown>;
    expect((thirdReply.root as Record<string, string>).uri).toContain("rkey1");
    expect((thirdReply.parent as Record<string, string>).uri).toContain("rkey2");
  });

  it("first post has no reply field", async () => {
    const req = makeJsonRequest({
      handle: "alice.bsky.social",
      appPassword: "xxxx",
      posts: [{ content: "First" }, { content: "Second" }],
    });
    await POST(req);

    const firstArgs = mockPost.mock.calls[0][0] as Record<string, unknown>;
    expect(firstArgs.reply).toBeUndefined();
  });

  it("embeds images when imageBlobs are provided", async () => {
    const blob = { $type: "blob", ref: { $link: "bafylink" }, mimeType: "image/jpeg", size: 1024 };
    const req = makeJsonRequest({
      handle: "alice.bsky.social",
      appPassword: "xxxx",
      posts: [{ content: "Look at this photo!", imageBlobs: [blob] }],
    });
    await POST(req);

    const callArgs = mockPost.mock.calls[0][0] as Record<string, unknown>;
    expect(callArgs.embed).toBeDefined();
    const embed = callArgs.embed as Record<string, unknown>;
    expect(embed.$type).toBe("app.bsky.embed.images");
    const images = embed.images as Array<Record<string, unknown>>;
    expect(images[0].image).toEqual(blob);
  });

  it("returns 400 when handle is missing", async () => {
    const req = makeJsonRequest({ appPassword: "xxxx", posts: [{ content: "Hello" }] });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when posts array is empty", async () => {
    const req = makeJsonRequest({ handle: "alice.bsky.social", appPassword: "xxxx", posts: [] });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 on API error", async () => {
    mockPost.mockRejectedValueOnce(new Error("Forbidden"));
    const req = makeJsonRequest({
      handle: "alice.bsky.social",
      appPassword: "xxxx",
      posts: [{ content: "Hello" }],
    });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;
    expect(res.status).toBe(400);
    expect(body.error).toBe("Forbidden");
  });
});
