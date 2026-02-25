import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeFormRequest, readJson } from "../../helpers/request";

const { mockLogin, mockUploadBlob } = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockUploadBlob: vi.fn(),
}));

vi.mock("@atproto/api", () => ({
  BskyAgent: vi.fn(function () {
    return {
      login: mockLogin,
      uploadBlob: mockUploadBlob,
      session: { did: "did:plc:alice" },
    };
  }),
}));

const { POST } = await import("@/app/api/bluesky/upload/route");

describe("POST /api/bluesky/upload", () => {
  const testFile = new File(["fake-image-bytes"], "photo.jpg", { type: "image/jpeg" });

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogin.mockResolvedValue(undefined);
    mockUploadBlob.mockResolvedValue({
      data: {
        blob: {
          $type: "blob",
          ref: { $link: "bafyreiabc123" },
          mimeType: "image/jpeg",
          size: 16,
        },
      },
    });
  });

  it("uploads a file and returns the blob reference", async () => {
    const req = makeFormRequest({
      handle: "alice.bsky.social",
      appPassword: "xxxx",
      file: testFile,
    });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body.blob).toBeDefined();
    const blob = body.blob as Record<string, unknown>;
    expect(blob.$type).toBe("blob");
    expect((blob.ref as Record<string, string>).$link).toBe("bafyreiabc123");
    expect(body.mimeType).toBe("image/jpeg");
  });

  it("calls uploadBlob with the correct MIME type", async () => {
    const pngFile = new File(["png-bytes"], "image.png", { type: "image/png" });
    const req = makeFormRequest({
      handle: "alice.bsky.social",
      appPassword: "xxxx",
      file: pngFile,
    });
    await POST(req);

    expect(mockUploadBlob).toHaveBeenCalledOnce();
    // Second argument should specify the encoding
    const [, opts] = mockUploadBlob.mock.calls[0] as [Buffer, { encoding: string }];
    expect(opts.encoding).toBe("image/png");
  });

  it("returns 400 when handle is missing", async () => {
    const req = makeFormRequest({ appPassword: "xxxx", file: testFile });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when file is missing", async () => {
    const req = makeFormRequest({ handle: "alice.bsky.social", appPassword: "xxxx" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when upload fails", async () => {
    mockUploadBlob.mockRejectedValueOnce(new Error("File too large"));

    const req = makeFormRequest({
      handle: "alice.bsky.social",
      appPassword: "xxxx",
      file: testFile,
    });
    const res = await POST(req);
    const body = await readJson(res) as Record<string, unknown>;

    expect(res.status).toBe(400);
    expect(body.error).toBe("File too large");
  });
});
