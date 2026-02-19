import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { makeJsonRequest, readJson } from "../../helpers/request";

const { POST } = await import("@/app/api/twitter/post/route");

const CREDS = {
  apiKey: "test-api-key",
  apiSecret: "test-api-secret",
  accessToken: "test-access-token",
  accessTokenSecret: "test-access-token-secret",
};

describe("POST /api/twitter/post", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockSuccess(tweetId = "tweet123") {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ data: { id: tweetId, text: "Hello!" } }),
    } as Response);
  }

  function mockError(detail: string, status = 403) {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status,
      json: async () => ({ detail }),
    } as Response);
  }

  it("posts successfully and returns tweet ID and URL", async () => {
    mockSuccess("1234567890");
    const req = makeJsonRequest({ ...CREDS, content: "Hello, X!" });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.postId).toBe("1234567890");
    expect(body.url).toBe("https://x.com/i/web/status/1234567890");
  });

  it("sends the tweet text in the request body", async () => {
    mockSuccess();
    const req = makeJsonRequest({ ...CREDS, content: "My tweet text" });
    await POST(req);

    const callBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(callBody.text).toBe("My tweet text");
  });

  it("includes OAuth Authorization header", async () => {
    mockSuccess();
    const req = makeJsonRequest({ ...CREDS, content: "Hello!" });
    await POST(req);

    const headers = vi.mocked(fetch).mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers.Authorization).toMatch(/^OAuth /);
    expect(headers.Authorization).toContain("oauth_consumer_key");
    expect(headers.Authorization).toContain("oauth_signature");
  });

  it("includes media field when mediaIds are provided", async () => {
    mockSuccess();
    const req = makeJsonRequest({ ...CREDS, content: "Photo!", mediaIds: ["media1", "media2"] });
    await POST(req);

    const callBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(callBody.media).toEqual({ media_ids: ["media1", "media2"] });
  });

  it("omits media field when mediaIds is empty", async () => {
    mockSuccess();
    const req = makeJsonRequest({ ...CREDS, content: "Text only" });
    await POST(req);

    const callBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(callBody.media).toBeUndefined();
  });

  it("returns 400 when apiKey is missing", async () => {
    const req = makeJsonRequest({ apiSecret: CREDS.apiSecret, accessToken: CREDS.accessToken, accessTokenSecret: CREDS.accessTokenSecret, content: "Hello" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when content is missing", async () => {
    const req = makeJsonRequest(CREDS);
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when Twitter API rejects the post", async () => {
    mockError("You are not allowed to create a Tweet with duplicate content.", 403);
    const req = makeJsonRequest({ ...CREDS, content: "Duplicate!" });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;

    expect(res.status).toBe(400);
    expect(body.error).toContain("duplicate");
  });

  it("posts to the v2 tweets endpoint", async () => {
    mockSuccess();
    const req = makeJsonRequest({ ...CREDS, content: "Hello!" });
    await POST(req);

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "https://api.twitter.com/2/tweets",
      expect.anything()
    );
  });
});
