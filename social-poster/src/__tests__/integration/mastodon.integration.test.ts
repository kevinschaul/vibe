/**
 * Mastodon integration tests — runs against a real Mastodon instance.
 * Skipped unless MASTODON_TEST_INSTANCE and MASTODON_TEST_ACCESS_TOKEN are set.
 */
import { describe, it, expect } from "vitest";

const INSTANCE = process.env.MASTODON_TEST_INSTANCE;
const TOKEN = process.env.MASTODON_TEST_ACCESS_TOKEN;
const CAN_POST = process.env.INTEGRATION_POST === "true";

const skip = !INSTANCE || !TOKEN;

function baseUrl() {
  return INSTANCE!.startsWith("http") ? INSTANCE! : `https://${INSTANCE!}`;
}

async function api(path: string, init?: RequestInit) {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", ...init?.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

describe.skipIf(skip)("Mastodon API integration", () => {
  it("verifies credentials successfully", async () => {
    const me = await api("/api/v1/accounts/verify_credentials");
    expect(me.username).toBeTruthy();
    expect(typeof me.followers_count).toBe("number");
    expect(typeof me.statuses_count).toBe("number");
  });

  it("fetches own statuses", async () => {
    const me = await api("/api/v1/accounts/verify_credentials");
    const statuses = await api(`/api/v1/accounts/${me.id}/statuses?limit=5`);
    expect(Array.isArray(statuses)).toBe(true);
  });

  it("parses status content correctly", async () => {
    const me = await api("/api/v1/accounts/verify_credentials");
    const statuses = await api(`/api/v1/accounts/${me.id}/statuses?limit=5`);
    if (statuses.length > 0) {
      expect(statuses[0]).toHaveProperty("content");
      expect(statuses[0]).toHaveProperty("favourites_count");
      expect(statuses[0]).toHaveProperty("reblogs_count");
      expect(statuses[0]).toHaveProperty("replies_count");
    }
  });

  it.skipIf(!CAN_POST)("publishes a test status and deletes it", async () => {
    const status = await api("/api/v1/statuses", {
      method: "POST",
      body: JSON.stringify({
        status: "[VIBE TEST] Integration test — please ignore",
        visibility: "public",
      }),
    });

    expect(status.id).toBeTruthy();
    expect(status.url).toBeTruthy();
    expect(status.content).toContain("VIBE TEST");

    // Clean up
    await api(`/api/v1/statuses/${status.id}`, { method: "DELETE" });
  });

  it.skipIf(!CAN_POST)("publishes a 2-post thread and deletes both", async () => {
    const s1 = await api("/api/v1/statuses", {
      method: "POST",
      body: JSON.stringify({ status: "[VIBE TEST] Thread 1/2 — please ignore", visibility: "public" }),
    });

    const s2 = await api("/api/v1/statuses", {
      method: "POST",
      body: JSON.stringify({
        status: "[VIBE TEST] Thread 2/2 — please ignore",
        in_reply_to_id: s1.id,
        visibility: "public",
      }),
    });

    expect(s2.in_reply_to_id).toBe(s1.id);

    // Clean up (delete in reverse order)
    await api(`/api/v1/statuses/${s2.id}`, { method: "DELETE" });
    await api(`/api/v1/statuses/${s1.id}`, { method: "DELETE" });
  });

  it.skipIf(!CAN_POST)("uploads an image and attaches it to a status", async () => {
    // Create a minimal 1x1 PNG (89 bytes)
    const PNG_1x1 = new Uint8Array([
      0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0x00,0x00,0x00,0x0d,0x49,0x48,0x44,0x52,
      0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,0x08,0x02,0x00,0x00,0x00,0x90,0x77,0x53,
      0xde,0x00,0x00,0x00,0x0c,0x49,0x44,0x41,0x54,0x08,0xd7,0x63,0xf8,0xcf,0xc0,0x00,
      0x00,0x00,0x02,0x00,0x01,0xe2,0x21,0xbc,0x33,0x00,0x00,0x00,0x00,0x49,0x45,0x4e,
      0x44,0xae,0x42,0x60,0x82,
    ]);

    const fd = new FormData();
    fd.append("file", new Blob([PNG_1x1], { type: "image/png" }), "test.png");

    const mediaRes = await fetch(`${baseUrl()}/api/v2/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}` },
      body: fd,
    });
    const media = await mediaRes.json();
    expect(media.id).toBeTruthy();

    // Attach to a status
    const status = await api("/api/v1/statuses", {
      method: "POST",
      body: JSON.stringify({
        status: "[VIBE TEST] Image test — please ignore",
        media_ids: [media.id],
        visibility: "public",
      }),
    });

    expect(status.id).toBeTruthy();
    expect(status.media_attachments).toHaveLength(1);

    // Clean up
    await api(`/api/v1/statuses/${status.id}`, { method: "DELETE" });
  });
});
