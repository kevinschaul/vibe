/**
 * Twitter/X integration tests — runs against the real Twitter API v2.
 * Skipped unless TWITTER_TEST_* env vars are set.
 *
 * Note: Twitter API requires Elevated access for most write operations.
 * Read-only tests (profile) work with Basic access.
 */
import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";

const API_KEY = process.env.TWITTER_TEST_API_KEY;
const API_SECRET = process.env.TWITTER_TEST_API_SECRET;
const ACCESS_TOKEN = process.env.TWITTER_TEST_ACCESS_TOKEN;
const ACCESS_TOKEN_SECRET = process.env.TWITTER_TEST_ACCESS_TOKEN_SECRET;
const CAN_POST = process.env.INTEGRATION_POST === "true";

const canRead = !!(API_KEY && API_SECRET && ACCESS_TOKEN && ACCESS_TOKEN_SECRET);
const canWrite = canRead && CAN_POST;

function buildOAuthHeader(method: string, url: string): string {
  const parsed = new URL(url);
  const baseUrl = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: API_KEY!,
    oauth_nonce: Math.random().toString(36).substring(2) + Date.now(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: ACCESS_TOKEN!,
    oauth_version: "1.0",
  };

  // Merge query params into the parameter set for signing
  const allParams: Record<string, string> = { ...oauthParams };
  parsed.searchParams.forEach((v, k) => { allParams[k] = v; });

  const sorted = Object.keys(allParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`)
    .join("&");

  const base = [method, encodeURIComponent(baseUrl), encodeURIComponent(sorted)].join("&");
  const signingKey = `${encodeURIComponent(API_SECRET!)}&${encodeURIComponent(ACCESS_TOKEN_SECRET!)}`;
  const sig = createHmac("sha1", signingKey).update(base).digest("base64");

  const header: Record<string, string> = { ...oauthParams, oauth_signature: sig };
  return (
    "OAuth " +
    Object.keys(header)
      .sort()
      .map((k) => `${encodeURIComponent(k)}="${encodeURIComponent(header[k])}"`)
      .join(", ")
  );
}

describe.skipIf(!canRead)("Twitter/X API integration (read)", () => {
  it("fetches the authenticated user profile", async () => {
    const url = "https://api.twitter.com/2/users/me?user.fields=public_metrics,profile_image_url,name,username";
    const res = await fetch(url, { headers: { Authorization: buildOAuthHeader("GET", url) } });
    const data = await res.json();

    expect(res.ok).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.username).toBeTruthy();
    expect(data.data.public_metrics).toBeDefined();
    expect(typeof data.data.public_metrics.followers_count).toBe("number");
    expect(typeof data.data.public_metrics.tweet_count).toBe("number");
  });

  it("returns proper field structure for user metrics", async () => {
    const url = "https://api.twitter.com/2/users/me?user.fields=public_metrics";
    const res = await fetch(url, { headers: { Authorization: buildOAuthHeader("GET", url) } });
    const data = await res.json();

    const metrics = data.data?.public_metrics;
    expect(metrics).toMatchObject({
      followers_count: expect.any(Number),
      following_count: expect.any(Number),
      tweet_count: expect.any(Number),
    });
  });
});

describe.skipIf(!canWrite)("Twitter/X API integration (write)", () => {
  it("posts a tweet and deletes it", async () => {
    const url = "https://api.twitter.com/2/tweets";
    const auth = buildOAuthHeader("POST", url);

    const postRes = await fetch(url, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ text: "[VIBE TEST] Integration test — please ignore" }),
    });
    const postData = await postRes.json();

    expect(postRes.ok).toBe(true);
    expect(postData.data?.id).toBeTruthy();

    const tweetId = postData.data.id;

    // Delete the tweet
    const deleteUrl = `https://api.twitter.com/2/tweets/${tweetId}`;
    const deleteAuth = buildOAuthHeader("DELETE", deleteUrl);
    const deleteRes = await fetch(deleteUrl, {
      method: "DELETE",
      headers: { Authorization: deleteAuth },
    });

    expect(deleteRes.ok).toBe(true);
    const deleteData = await deleteRes.json();
    expect(deleteData.data?.deleted).toBe(true);
  });

  it("posts a 2-tweet thread and deletes both", async () => {
    const url = "https://api.twitter.com/2/tweets";

    const auth1 = buildOAuthHeader("POST", url);
    const t1Res = await fetch(url, {
      method: "POST",
      headers: { Authorization: auth1, "Content-Type": "application/json" },
      body: JSON.stringify({ text: "[VIBE TEST] Thread 1/2 — please ignore" }),
    });
    const t1Data = await t1Res.json();
    expect(t1Res.ok).toBe(true);
    const t1Id = t1Data.data.id;

    const auth2 = buildOAuthHeader("POST", url);
    const t2Res = await fetch(url, {
      method: "POST",
      headers: { Authorization: auth2, "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "[VIBE TEST] Thread 2/2 — please ignore",
        reply: { in_reply_to_tweet_id: t1Id },
      }),
    });
    const t2Data = await t2Res.json();
    expect(t2Res.ok).toBe(true);
    const t2Id = t2Data.data.id;

    // Cleanup
    for (const id of [t2Id, t1Id]) {
      const deleteUrl = `https://api.twitter.com/2/tweets/${id}`;
      const auth = buildOAuthHeader("DELETE", deleteUrl);
      await fetch(deleteUrl, { method: "DELETE", headers: { Authorization: auth } });
    }
  });
});
