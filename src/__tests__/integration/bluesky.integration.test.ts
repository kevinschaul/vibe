/**
 * Bluesky integration tests — runs against the real bsky.social API.
 * Skipped unless BLUESKY_TEST_HANDLE and BLUESKY_TEST_APP_PASSWORD are set.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { BskyAgent, RichText } from "@atproto/api";

const HANDLE = process.env.BLUESKY_TEST_HANDLE;
const APP_PASSWORD = process.env.BLUESKY_TEST_APP_PASSWORD;
const CAN_POST = process.env.INTEGRATION_POST === "true";

const skip = !HANDLE || !APP_PASSWORD;

describe.skipIf(skip)("Bluesky API integration", () => {
  let agent: BskyAgent;

  beforeAll(async () => {
    agent = new BskyAgent({ service: "https://bsky.social" });
    await agent.login({ identifier: HANDLE!, password: APP_PASSWORD! });
  });

  it("authenticates successfully", () => {
    expect(agent.session).toBeDefined();
    expect(agent.session!.handle).toBe(HANDLE);
    expect(agent.session!.did).toMatch(/^did:/);
  });

  it("fetches the authenticated user profile", async () => {
    const res = await agent.getProfile({ actor: agent.session!.did });
    expect(res.success).toBe(true);
    expect(res.data.handle).toBe(HANDLE);
    expect(typeof res.data.followersCount).toBe("number");
    expect(typeof res.data.postsCount).toBe("number");
  });

  it("resolves facets in text with links and mentions", async () => {
    const rt = new RichText({ text: "Hello https://example.com and @bsky.app" });
    await rt.detectFacets(agent);
    // Should find at least the URL facet
    expect(rt.facets).toBeDefined();
    expect(rt.facets!.length).toBeGreaterThan(0);
  });

  it("fetches the author feed", async () => {
    const res = await agent.getAuthorFeed({ actor: agent.session!.did, limit: 5 });
    expect(res.success).toBe(true);
    expect(Array.isArray(res.data.feed)).toBe(true);
  });

  it.skipIf(!CAN_POST)("publishes a test post and deletes it", async () => {
    const rt = new RichText({ text: "[VIBE TEST] Integration test — please ignore" });
    await rt.detectFacets(agent);

    const result = await agent.post({
      text: rt.text,
      facets: rt.facets,
      createdAt: new Date().toISOString(),
    });

    expect(result.uri).toMatch(/^at:\/\//);
    expect(result.cid).toBeTruthy();

    // Clean up: delete the test post
    await agent.deletePost(result.uri);
  });

  it.skipIf(!CAN_POST)("publishes a 2-post thread and deletes both", async () => {
    const posts: { uri: string; cid: string }[] = [];

    const rt1 = new RichText({ text: "[VIBE TEST] Thread post 1/2 — please ignore" });
    await rt1.detectFacets(agent);
    const p1 = await agent.post({ text: rt1.text, facets: rt1.facets, createdAt: new Date().toISOString() });
    posts.push(p1);

    const rt2 = new RichText({ text: "[VIBE TEST] Thread post 2/2 — please ignore" });
    await rt2.detectFacets(agent);
    const p2 = await agent.post({
      text: rt2.text,
      facets: rt2.facets,
      reply: { root: p1, parent: p1 },
      createdAt: new Date().toISOString(),
    });
    posts.push(p2);

    expect(posts).toHaveLength(2);
    expect(p2.uri).not.toBe(p1.uri);

    // Clean up
    for (const p of posts.reverse()) {
      await agent.deletePost(p.uri);
    }
  });
});
