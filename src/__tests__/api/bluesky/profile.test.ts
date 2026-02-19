import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeJsonRequest, readJson } from "../../helpers/request";

// vi.hoisted ensures these are defined before vi.mock's factory runs
const { mockLogin, mockGetProfile } = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockGetProfile: vi.fn(),
}));

vi.mock("@atproto/api", () => ({
  BskyAgent: vi.fn(function () {
    return {
      login: mockLogin,
      getProfile: mockGetProfile,
      session: { did: "did:plc:testuser" },
    };
  }),
}));

const { POST } = await import("@/app/api/bluesky/profile/route");

describe("POST /api/bluesky/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogin.mockResolvedValue(undefined);
    mockGetProfile.mockResolvedValue({
      data: {
        handle: "alice.bsky.social",
        displayName: "Alice",
        avatar: "https://cdn.bsky.app/alice.jpg",
        followersCount: 1200,
        followsCount: 300,
        postsCount: 450,
      },
    });
  });

  it("returns profile data on valid credentials", async () => {
    const req = makeJsonRequest({ handle: "alice.bsky.social", appPassword: "xxxx-xxxx-xxxx-xxxx" });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body.handle).toBe("alice.bsky.social");
    expect(body.displayName).toBe("Alice");
    expect(body.avatarUrl).toBe("https://cdn.bsky.app/alice.jpg");
    expect(body.followers).toBe(1200);
    expect(body.following).toBe(300);
    expect(body.posts).toBe(450);
  });

  it("falls back to handle when displayName is absent", async () => {
    mockGetProfile.mockResolvedValueOnce({
      data: {
        handle: "bob.bsky.social",
        displayName: undefined,
        followersCount: 0,
        followsCount: 0,
        postsCount: 0,
      },
    });

    const req = makeJsonRequest({ handle: "bob.bsky.social", appPassword: "xxxx" });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body.displayName).toBe("bob.bsky.social");
  });

  it("returns 400 when handle is missing", async () => {
    const req = makeJsonRequest({ appPassword: "xxxx-xxxx-xxxx-xxxx" });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;

    expect(res.status).toBe(400);
    expect(body.error).toBeTruthy();
  });

  it("returns 400 when appPassword is missing", async () => {
    const req = makeJsonRequest({ handle: "alice.bsky.social" });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 when login throws an error", async () => {
    mockLogin.mockRejectedValueOnce(new Error("Invalid App Password"));

    const req = makeJsonRequest({ handle: "alice.bsky.social", appPassword: "bad-password" });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid App Password");
  });

  it("returns 400 when getProfile throws", async () => {
    mockGetProfile.mockRejectedValueOnce(new Error("Profile not found"));

    const req = makeJsonRequest({ handle: "alice.bsky.social", appPassword: "xxxx" });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;

    expect(res.status).toBe(400);
    expect(body.error).toBe("Profile not found");
  });

  it("calls login with correct credentials", async () => {
    const req = makeJsonRequest({ handle: "alice.bsky.social", appPassword: "my-app-pass" });
    await POST(req);

    expect(mockLogin).toHaveBeenCalledWith({
      identifier: "alice.bsky.social",
      password: "my-app-pass",
    });
  });
});
