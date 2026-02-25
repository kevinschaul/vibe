import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeJsonRequest, readJson } from "../../helpers/request";

const { POST } = await import("@/app/api/mastodon/profile/route");

const PROFILE_RESPONSE = {
  username: "alice",
  display_name: "Alice Wonderland",
  avatar: "https://mastodon.social/avatars/alice.jpg",
  followers_count: 500,
  following_count: 200,
  statuses_count: 1200,
  acct: "alice",
};

describe("POST /api/mastodon/profile", () => {
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

  it("returns profile data with https:// prefixed instance", async () => {
    mockFetch(PROFILE_RESPONSE);

    const req = makeJsonRequest({ instance: "https://mastodon.social", accessToken: "tok123" });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body.handle).toBe("alice@mastodon.social");
    expect(body.displayName).toBe("Alice Wonderland");
    expect(body.avatarUrl).toBe(PROFILE_RESPONSE.avatar);
    expect(body.followers).toBe(500);
    expect(body.following).toBe(200);
    expect(body.posts).toBe(1200);
  });

  it("auto-prepends https:// when instance has no scheme", async () => {
    mockFetch(PROFILE_RESPONSE);

    const req = makeJsonRequest({ instance: "mastodon.social", accessToken: "tok123" });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;

    expect(res.status).toBe(200);
    // Verify the fetch was called with https://
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "https://mastodon.social/api/v1/accounts/verify_credentials",
      expect.objectContaining({ headers: { Authorization: "Bearer tok123" } })
    );
    expect(body.handle).toBe("alice@mastodon.social");
  });

  it("falls back to username when display_name is empty", async () => {
    mockFetch({ ...PROFILE_RESPONSE, display_name: "" });

    const req = makeJsonRequest({ instance: "mastodon.social", accessToken: "tok" });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;

    expect(body.displayName).toBe("alice");
  });

  it("defaults missing counts to 0", async () => {
    mockFetch({
      username: "bob",
      display_name: "Bob",
      acct: "bob",
      // counts undefined
    });

    const req = makeJsonRequest({ instance: "mastodon.social", accessToken: "tok" });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;

    expect(body.followers).toBe(0);
    expect(body.following).toBe(0);
    expect(body.posts).toBe(0);
  });

  it("returns 400 when instance is missing", async () => {
    const req = makeJsonRequest({ accessToken: "tok" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when accessToken is missing", async () => {
    const req = makeJsonRequest({ instance: "mastodon.social" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when the Mastodon API returns an error status", async () => {
    mockFetch({ error: "Invalid token" }, false, 401);

    const req = makeJsonRequest({ instance: "mastodon.social", accessToken: "bad-token" });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;

    expect(res.status).toBe(400);
    expect(body.error).toContain("401");
  });
});
