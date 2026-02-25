/**
 * Blog integration tests — runs against a real WordPress instance.
 * Skipped unless WP_TEST_* env vars are set.
 */
import { describe, it, expect } from "vitest";

const WP_URL = process.env.WP_TEST_URL?.replace(/\/$/, "");
const WP_USER = process.env.WP_TEST_USERNAME;
const WP_PASS = process.env.WP_TEST_APP_PASSWORD;
const CAN_POST = process.env.INTEGRATION_POST === "true";

const skip = !WP_URL || !WP_USER || !WP_PASS;

function wpAuth() {
  return `Basic ${Buffer.from(`${WP_USER}:${WP_PASS}`).toString("base64")}`;
}

describe.skipIf(skip)("WordPress API integration", () => {
  it("authenticates and fetches the site info", async () => {
    const res = await fetch(`${WP_URL}/wp-json/wp/v2`, {
      headers: { Authorization: wpAuth() },
    });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.name).toBeTruthy();
    expect(data.url).toBeTruthy();
  });

  it("verifies write access by checking the users endpoint", async () => {
    const res = await fetch(`${WP_URL}/wp-json/wp/v2/users/me`, {
      headers: { Authorization: wpAuth() },
    });
    expect(res.ok).toBe(true);
    const me = await res.json();
    expect(me.name).toBeTruthy();
    expect(me.capabilities).toBeDefined();
  });

  it.skipIf(!CAN_POST)("publishes a test post and deletes it", async () => {
    // Create post
    const createRes = await fetch(`${WP_URL}/wp-json/wp/v2/posts`, {
      method: "POST",
      headers: {
        Authorization: wpAuth(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "[VIBE TEST] Integration test — please delete",
        content: "<p>This is an automated test post from Vibe. Please delete it.</p>",
        status: "publish",
        slug: `vibe-test-${Date.now()}`,
        tags: [],
      }),
    });

    const post = await createRes.json();
    expect(createRes.ok).toBe(true);
    expect(post.id).toBeTruthy();
    expect(post.link).toBeTruthy();
    expect(post.status).toBe("publish");

    // Clean up: delete the post
    const deleteRes = await fetch(`${WP_URL}/wp-json/wp/v2/posts/${post.id}?force=true`, {
      method: "DELETE",
      headers: { Authorization: wpAuth() },
    });
    expect(deleteRes.ok).toBe(true);
  });

  it.skipIf(!CAN_POST)("publishes with correct slug and verifies it", async () => {
    const slug = `vibe-test-slug-${Date.now()}`;

    const createRes = await fetch(`${WP_URL}/wp-json/wp/v2/posts`, {
      method: "POST",
      headers: { Authorization: wpAuth(), "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "[VIBE TEST] Slug test",
        content: "<p>Testing slug.</p>",
        status: "publish",
        slug,
      }),
    });

    const post = await createRes.json();
    expect(createRes.ok).toBe(true);
    expect(post.slug).toBe(slug);

    // Cleanup
    await fetch(`${WP_URL}/wp-json/wp/v2/posts/${post.id}?force=true`, {
      method: "DELETE",
      headers: { Authorization: wpAuth() },
    });
  });
});
