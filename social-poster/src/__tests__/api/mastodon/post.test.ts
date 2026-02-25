import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { makeJsonRequest, readJson } from "../../helpers/request";

const { POST } = await import("@/app/api/mastodon/post/route");

describe("POST /api/mastodon/post", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockFetch(data: unknown, ok = true, status = 200) {
    vi.mocked(fetch).mockResolvedValue({
      ok,
      status,
      json: async () => data,
    } as Response);
  }

  it("posts successfully and returns post ID and URL", async () => {
    mockFetch({ id: "109876543210", url: "https://mastodon.social/@alice/109876543210" });

    const req = makeJsonRequest({
      instance: "mastodon.social",
      accessToken: "tok123",
      content: "Hello Mastodon!",
    });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.postId).toBe("109876543210");
    expect(body.url).toBe("https://mastodon.social/@alice/109876543210");
  });

  it("sends the status with default public visibility", async () => {
    mockFetch({ id: "1", url: "https://mastodon.social/@alice/1" });

    const req = makeJsonRequest({
      instance: "mastodon.social",
      accessToken: "tok",
      content: "Public post",
    });
    await POST(req);

    const callBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(callBody.visibility).toBe("public");
  });

  it("respects a custom visibility setting", async () => {
    mockFetch({ id: "2", url: "https://mastodon.social/@alice/2" });

    const req = makeJsonRequest({
      instance: "mastodon.social",
      accessToken: "tok",
      content: "Private post",
      visibility: "private",
    });
    await POST(req);

    const callBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(callBody.visibility).toBe("private");
  });

  it("auto-prepends https:// to instance without scheme", async () => {
    mockFetch({ id: "3", url: "https://fosstodon.org/@alice/3" });

    const req = makeJsonRequest({
      instance: "fosstodon.org",
      accessToken: "tok",
      content: "Hello!",
    });
    await POST(req);

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "https://fosstodon.org/api/v1/statuses",
      expect.anything()
    );
  });

  it("returns 400 when instance is missing", async () => {
    const req = makeJsonRequest({ accessToken: "tok", content: "Hello" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when content is missing", async () => {
    const req = makeJsonRequest({ instance: "mastodon.social", accessToken: "tok" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when Mastodon API returns an error", async () => {
    mockFetch({ error: "This status is a duplicate" }, false, 422);

    const req = makeJsonRequest({
      instance: "mastodon.social",
      accessToken: "tok",
      content: "Duplicate!",
    });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;

    expect(res.status).toBe(400);
    expect(body.error).toBe("This status is a duplicate");
  });
});
