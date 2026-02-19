import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { makeFormRequest, readJson } from "../../helpers/request";

const { POST } = await import("@/app/api/mastodon/upload/route");

describe("POST /api/mastodon/upload", () => {
  const testFile = new File(["fake-image"], "photo.png", { type: "image/png" });

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: "media999",
        url: "https://files.mastodon.social/media/photo.png",
        preview_url: "https://files.mastodon.social/preview/photo.png",
      }),
    } as Response);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uploads a file and returns media ID and URLs", async () => {
    const req = makeFormRequest({
      instance: "mastodon.social",
      accessToken: "tok",
      file: testFile,
    });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body.mediaId).toBe("media999");
    expect(body.url).toBe("https://files.mastodon.social/media/photo.png");
    expect(body.previewUrl).toBe("https://files.mastodon.social/preview/photo.png");
  });

  it("calls the v2/media endpoint with Bearer authorization", async () => {
    const req = makeFormRequest({
      instance: "mastodon.social",
      accessToken: "mytoken",
      file: testFile,
    });
    await POST(req);

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "https://mastodon.social/api/v2/media",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer mytoken" },
      })
    );
  });

  it("auto-prepends https:// to bare instance name", async () => {
    const req = makeFormRequest({ instance: "fosstodon.org", accessToken: "tok", file: testFile });
    await POST(req);

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "https://fosstodon.org/api/v2/media",
      expect.anything()
    );
  });

  it("returns 400 when instance is missing", async () => {
    const req = makeFormRequest({ accessToken: "tok", file: testFile });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when file is missing", async () => {
    const req = makeFormRequest({ instance: "mastodon.social", accessToken: "tok" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when the media API returns an error", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ error: "File format not supported" }),
    } as Response);

    const req = makeFormRequest({
      instance: "mastodon.social",
      accessToken: "tok",
      file: new File(["data"], "file.bmp", { type: "image/bmp" }),
    });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;

    expect(res.status).toBe(400);
    expect(body.error).toContain("422");
  });
});
