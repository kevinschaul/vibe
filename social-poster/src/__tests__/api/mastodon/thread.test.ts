import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { makeJsonRequest, readJson } from "../../helpers/request";

const { POST } = await import("@/app/api/mastodon/thread/route");

describe("POST /api/mastodon/thread", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  let postIdCounter = 0;

  function mockFetchSequential() {
    postIdCounter = 0;
    vi.mocked(fetch).mockImplementation(async () => {
      postIdCounter++;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: `status${postIdCounter}`,
          url: `https://mastodon.social/@alice/status${postIdCounter}`,
        }),
      } as Response;
    });
  }

  it("posts a single status and returns it", async () => {
    mockFetchSequential();
    const req = makeJsonRequest({
      instance: "mastodon.social",
      accessToken: "tok",
      posts: [{ content: "Hello!" }],
    });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    const posts = body.posts as Array<Record<string, unknown>>;
    expect(posts).toHaveLength(1);
    expect(posts[0].id).toBe("status1");
  });

  it("posts a thread with correct in_reply_to_id chain", async () => {
    mockFetchSequential();
    const req = makeJsonRequest({
      instance: "mastodon.social",
      accessToken: "tok",
      posts: [
        { content: "1/3 First post" },
        { content: "2/3 Second post" },
        { content: "3/3 Third post" },
      ],
    });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;

    expect((body.posts as unknown[]).length).toBe(3);

    // Second call should reply to status1
    const secondCallBody = JSON.parse(vi.mocked(fetch).mock.calls[1][1]?.body as string);
    expect(secondCallBody.in_reply_to_id).toBe("status1");

    // Third call should reply to status2
    const thirdCallBody = JSON.parse(vi.mocked(fetch).mock.calls[2][1]?.body as string);
    expect(thirdCallBody.in_reply_to_id).toBe("status2");
  });

  it("includes media_ids when provided", async () => {
    mockFetchSequential();
    const req = makeJsonRequest({
      instance: "mastodon.social",
      accessToken: "tok",
      posts: [{ content: "Look at this!", mediaIds: ["media111", "media222"] }],
    });
    await POST(req);

    const callBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(callBody.media_ids).toEqual(["media111", "media222"]);
  });

  it("passes through custom visibility", async () => {
    mockFetchSequential();
    const req = makeJsonRequest({
      instance: "mastodon.social",
      accessToken: "tok",
      posts: [{ content: "Unlisted post" }],
      visibility: "unlisted",
    });
    await POST(req);

    const callBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(callBody.visibility).toBe("unlisted");
  });

  it("returns 400 when posts is empty", async () => {
    const req = makeJsonRequest({ instance: "mastodon.social", accessToken: "tok", posts: [] });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 on API error mid-thread", async () => {
    postIdCounter = 0;
    vi.mocked(fetch).mockImplementation(async () => {
      postIdCounter++;
      if (postIdCounter === 2) {
        return { ok: false, status: 500, json: async () => ({ error: "Server error" }) } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: `status${postIdCounter}`, url: "" }),
      } as Response;
    });

    const req = makeJsonRequest({
      instance: "mastodon.social",
      accessToken: "tok",
      posts: [{ content: "Post 1" }, { content: "Post 2 — will fail" }],
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
