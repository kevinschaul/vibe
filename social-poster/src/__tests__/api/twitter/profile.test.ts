import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { makeJsonRequest, readJson } from "../../helpers/request";

const { POST } = await import("@/app/api/twitter/profile/route");

const TWITTER_USER = {
  data: {
    id: "123456789",
    name: "Alice Twitterson",
    username: "alicetw",
    profile_image_url: "https://pbs.twimg.com/profile_images/alice.jpg",
    public_metrics: {
      followers_count: 8500,
      following_count: 400,
      tweet_count: 3200,
    },
  },
};

describe("POST /api/twitter/profile", () => {
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

  it("returns profile data for a valid bearer token", async () => {
    mockFetch(TWITTER_USER);

    const req = makeJsonRequest({ bearerToken: "AAAA..." });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body.handle).toBe("@alicetw");
    expect(body.displayName).toBe("Alice Twitterson");
    expect(body.avatarUrl).toBe("https://pbs.twimg.com/profile_images/alice.jpg");
    expect(body.followers).toBe(8500);
    expect(body.following).toBe(400);
    expect(body.posts).toBe(3200);
    expect(body.userId).toBe("123456789");
  });

  it("sends correct Bearer authorization header", async () => {
    mockFetch(TWITTER_USER);

    const req = makeJsonRequest({ bearerToken: "my-secret-bearer-token" });
    await POST(req);

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining("/2/users/me"),
      expect.objectContaining({
        headers: { Authorization: "Bearer my-secret-bearer-token" },
      })
    );
  });

  it("requests all required user fields", async () => {
    mockFetch(TWITTER_USER);
    const req = makeJsonRequest({ bearerToken: "tok" });
    await POST(req);

    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).toContain("user.fields=public_metrics");
    expect(url).toContain("profile_image_url");
  });

  it("defaults missing public_metrics to 0", async () => {
    mockFetch({
      data: {
        id: "999",
        name: "New User",
        username: "newuser",
        // public_metrics absent
      },
    });

    const req = makeJsonRequest({ bearerToken: "tok" });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;

    expect(body.followers).toBe(0);
    expect(body.following).toBe(0);
    expect(body.posts).toBe(0);
  });

  it("returns 400 when bearerToken is missing", async () => {
    const req = makeJsonRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when Twitter API returns 401", async () => {
    mockFetch({ title: "Unauthorized", detail: "Unauthorized" }, false, 401);

    const req = makeJsonRequest({ bearerToken: "bad-token" });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;

    expect(res.status).toBe(400);
    expect(body.error).toBeTruthy();
  });

  it("returns 400 when Twitter API returns 403 (app-only restriction)", async () => {
    mockFetch(
      { title: "Forbidden", detail: "This app cannot access this resource" },
      false,
      403
    );

    const req = makeJsonRequest({ bearerToken: "valid-token" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
