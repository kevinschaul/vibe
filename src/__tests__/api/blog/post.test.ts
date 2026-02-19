import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { makeJsonRequest, readJson } from "../../helpers/request";

const { POST } = await import("@/app/api/blog/post/route");

describe("POST /api/blog/post", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ─── WordPress ─────────────────────────────────────────────────────────────

  describe("WordPress", () => {
    function mockWP(data: unknown, ok = true) {
      vi.mocked(fetch).mockResolvedValue({ ok, json: async () => data } as Response);
    }

    const WP_CREDS = {
      type: "wordpress",
      url: "https://myblog.com",
      username: "admin",
      password: "app-password-here",
    };

    it("posts successfully and returns post ID and link", async () => {
      mockWP({ id: 42, link: "https://myblog.com/my-post/" });

      const req = makeJsonRequest({ ...WP_CREDS, title: "My Post", content: "<p>Hello!</p>" });
      const res = await POST(req);
      const body = await readJson(res) as Record<string, unknown>;

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.postId).toBe(42);
      expect(body.url).toBe("https://myblog.com/my-post/");
    });

    it("posts to the correct WP REST API endpoint", async () => {
      mockWP({ id: 1, link: "" });
      const req = makeJsonRequest({ ...WP_CREDS, title: "T", content: "C" });
      await POST(req);

      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        "https://myblog.com/wp-json/wp/v2/posts",
        expect.anything()
      );
    });

    it("strips trailing slash from blog URL before building endpoint", async () => {
      mockWP({ id: 1, link: "" });
      const req = makeJsonRequest({ ...WP_CREDS, url: "https://myblog.com/", title: "T", content: "C" });
      await POST(req);

      const url = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(url).toBe("https://myblog.com/wp-json/wp/v2/posts");
    });

    it("sends Basic auth header with base64-encoded credentials", async () => {
      mockWP({ id: 1, link: "" });
      const req = makeJsonRequest({ ...WP_CREDS, title: "T", content: "C" });
      await POST(req);

      const headers = vi.mocked(fetch).mock.calls[0][1]?.headers as Record<string, string>;
      const expected = Buffer.from("admin:app-password-here").toString("base64");
      expect(headers.Authorization).toBe(`Basic ${expected}`);
    });

    it("includes slug and tags when provided", async () => {
      mockWP({ id: 1, link: "" });
      const req = makeJsonRequest({
        ...WP_CREDS,
        title: "T",
        content: "C",
        slug: "my-post",
        tags: ["javascript", "nextjs"],
      });
      await POST(req);

      const callBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      expect(callBody.slug).toBe("my-post");
      expect(callBody.tags).toEqual(["javascript", "nextjs"]);
    });

    it("always sets status to publish", async () => {
      mockWP({ id: 1, link: "" });
      const req = makeJsonRequest({ ...WP_CREDS, title: "T", content: "C" });
      await POST(req);

      const callBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      expect(callBody.status).toBe("publish");
    });

    it("returns 400 when WordPress API returns an error", async () => {
      mockWP({ message: "Sorry, you are not allowed to create posts as this user." }, false);
      const req = makeJsonRequest({ ...WP_CREDS, title: "T", content: "C" });
      const res = await POST(req);
      const body = await readJson(res) as Record<string, unknown>;

      expect(res.status).toBe(400);
      expect(body.error).toContain("not allowed");
    });
  });

  // ─── Ghost ─────────────────────────────────────────────────────────────────

  describe("Ghost", () => {
    const GHOST_CREDS = {
      type: "ghost",
      url: "https://myghost.com",
      apiKey: "keyid:hexsecret1234567890abcdef",
    };

    function mockGhost(data: unknown, ok = true) {
      vi.mocked(fetch).mockResolvedValue({ ok, json: async () => data } as Response);
    }

    it("posts successfully and returns post ID and URL", async () => {
      mockGhost({
        posts: [{ id: "ghost-post-id", url: "https://myghost.com/my-post/" }],
      });

      const req = makeJsonRequest({ ...GHOST_CREDS, title: "Ghost Post", content: "<p>Content</p>" });
      const res = await POST(req);
      const body = await readJson(res) as Record<string, unknown>;

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.postId).toBe("ghost-post-id");
      expect(body.url).toBe("https://myghost.com/my-post/");
    });

    it("posts to the Ghost Admin API endpoint", async () => {
      mockGhost({ posts: [{ id: "1", url: "" }] });
      const req = makeJsonRequest({ ...GHOST_CREDS, title: "T", content: "C" });
      await POST(req);

      const url = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(url).toBe("https://myghost.com/ghost/api/admin/posts/");
    });

    it("sends a Ghost JWT Authorization header", async () => {
      mockGhost({ posts: [{ id: "1", url: "" }] });
      const req = makeJsonRequest({ ...GHOST_CREDS, title: "T", content: "C" });
      await POST(req);

      const headers = vi.mocked(fetch).mock.calls[0][1]?.headers as Record<string, string>;
      expect(headers.Authorization).toMatch(/^Ghost /);
    });

    it("sets post status to published", async () => {
      mockGhost({ posts: [{ id: "1", url: "" }] });
      const req = makeJsonRequest({ ...GHOST_CREDS, title: "T", content: "C" });
      await POST(req);

      const callBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      expect(callBody.posts[0].status).toBe("published");
    });

    it("includes slug and tags when provided", async () => {
      mockGhost({ posts: [{ id: "1", url: "" }] });
      const req = makeJsonRequest({
        ...GHOST_CREDS,
        title: "T",
        content: "C",
        slug: "custom-slug",
        tags: ["tech", "web"],
      });
      await POST(req);

      const callBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      expect(callBody.posts[0].slug).toBe("custom-slug");
      expect(callBody.posts[0].tags).toEqual([{ name: "tech" }, { name: "web" }]);
    });

    it("returns 400 when Ghost API returns errors", async () => {
      mockGhost({ errors: [{ message: "Validation error" }] }, false);
      const req = makeJsonRequest({ ...GHOST_CREDS, title: "T", content: "C" });
      const res = await POST(req);
      const body = await readJson(res) as Record<string, unknown>;

      expect(res.status).toBe(400);
      expect(body.error).toBe("Validation error");
    });
  });

  // ─── Webhook ───────────────────────────────────────────────────────────────

  describe("Webhook", () => {
    const WEBHOOK_CREDS = {
      type: "webhook",
      url: "https://myblog.com",
      webhookUrl: "https://hooks.myblog.com/publish",
    };

    it("posts to the webhook URL and returns success", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ url: "https://myblog.com/new-post" }),
      } as Response);

      const req = makeJsonRequest({ ...WEBHOOK_CREDS, title: "Webhook Post", content: "Body" });
      const res = await POST(req);
      const body = await readJson(res) as Record<string, unknown>;

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.url).toBe("https://myblog.com/new-post");
    });

    it("sends title, content, slug and tags to webhook", async () => {
      vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({}) } as Response);

      const req = makeJsonRequest({
        ...WEBHOOK_CREDS,
        title: "My Title",
        content: "<p>Content</p>",
        slug: "my-title",
        tags: ["a", "b"],
      });
      await POST(req);

      const callBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      expect(callBody).toMatchObject({
        title: "My Title",
        content: "<p>Content</p>",
        slug: "my-title",
        tags: ["a", "b"],
      });
    });

    it("returns 400 when webhook responds with error status", async () => {
      vi.mocked(fetch).mockResolvedValue({ ok: false, status: 500 } as Response);

      const req = makeJsonRequest({ ...WEBHOOK_CREDS, title: "T", content: "C" });
      const res = await POST(req);
      const body = await readJson(res) as Record<string, unknown>;

      expect(res.status).toBe(400);
      expect(body.error).toContain("500");
    });
  });

  // ─── Unknown type ──────────────────────────────────────────────────────────

  it("returns 400 for unknown blog type", async () => {
    const req = makeJsonRequest({
      type: "medium",
      url: "https://medium.com",
      title: "T",
      content: "C",
    });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;

    expect(res.status).toBe(400);
    expect(body.error).toBe("Unknown blog type");
  });
});
