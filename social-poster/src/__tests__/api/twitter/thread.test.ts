import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { makeJsonRequest, readJson } from "../../helpers/request";

const { POST } = await import("@/app/api/twitter/thread/route");

const CREDS = {
  apiKey: "test-api-key",
  apiSecret: "test-api-secret",
  accessToken: "test-access-token",
  accessTokenSecret: "test-access-token-secret",
};

describe("POST /api/twitter/thread", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  let tweetCounter = 0;

  function mockSequentialTweets() {
    tweetCounter = 0;
    vi.mocked(fetch).mockImplementation(async () => {
      tweetCounter++;
      return {
        ok: true,
        status: 201,
        json: async () => ({ data: { id: `tweet${tweetCounter}`, text: "" } }),
      } as Response;
    });
  }

  it("posts a single tweet and returns it", async () => {
    mockSequentialTweets();
    const req = makeJsonRequest({ ...CREDS, posts: [{ content: "Solo tweet" }] });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    const posts = body.posts as Array<Record<string, unknown>>;
    expect(posts).toHaveLength(1);
    expect(posts[0].id).toBe("tweet1");
    expect(posts[0].url).toBe("https://x.com/i/web/status/tweet1");
  });

  it("posts a thread with reply chain", async () => {
    mockSequentialTweets();
    const req = makeJsonRequest({
      ...CREDS,
      posts: [
        { content: "Thread 1/3" },
        { content: "Thread 2/3" },
        { content: "Thread 3/3" },
      ],
    });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;

    expect((body.posts as unknown[]).length).toBe(3);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3);

    // Second tweet should reply to the first
    const secondBody = JSON.parse(vi.mocked(fetch).mock.calls[1][1]?.body as string);
    expect(secondBody.reply).toEqual({ in_reply_to_tweet_id: "tweet1" });

    // Third tweet should reply to the second
    const thirdBody = JSON.parse(vi.mocked(fetch).mock.calls[2][1]?.body as string);
    expect(thirdBody.reply).toEqual({ in_reply_to_tweet_id: "tweet2" });
  });

  it("first tweet has no reply field", async () => {
    mockSequentialTweets();
    const req = makeJsonRequest({
      ...CREDS,
      posts: [{ content: "First" }, { content: "Second" }],
    });
    await POST(req);

    const firstBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(firstBody.reply).toBeUndefined();
  });

  it("includes OAuth header in each request", async () => {
    mockSequentialTweets();
    const req = makeJsonRequest({
      ...CREDS,
      posts: [{ content: "Tweet 1" }, { content: "Tweet 2" }],
    });
    await POST(req);

    for (const call of vi.mocked(fetch).mock.calls) {
      const headers = call[1]?.headers as Record<string, string>;
      expect(headers.Authorization).toMatch(/^OAuth /);
    }
  });

  it("includes media_ids when provided", async () => {
    mockSequentialTweets();
    const req = makeJsonRequest({
      ...CREDS,
      posts: [{ content: "With image", mediaIds: ["m1"] }],
    });
    await POST(req);

    const callBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(callBody.media).toEqual({ media_ids: ["m1"] });
  });

  it("returns 400 when credentials are missing", async () => {
    const req = makeJsonRequest({ posts: [{ content: "Hello" }] });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when posts array is empty", async () => {
    const req = makeJsonRequest({ ...CREDS, posts: [] });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 on Twitter API error mid-thread", async () => {
    tweetCounter = 0;
    vi.mocked(fetch).mockImplementation(async () => {
      tweetCounter++;
      if (tweetCounter === 2) {
        return {
          ok: false,
          status: 429,
          json: async () => ({ title: "Too Many Requests", detail: "Rate limit exceeded" }),
        } as Response;
      }
      return {
        ok: true,
        status: 201,
        json: async () => ({ data: { id: `tweet${tweetCounter}` } }),
      } as Response;
    });

    const req = makeJsonRequest({
      ...CREDS,
      posts: [{ content: "First" }, { content: "Second — will fail" }],
    });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;

    expect(res.status).toBe(400);
    expect(body.error).toContain("Rate limit");
  });
});
