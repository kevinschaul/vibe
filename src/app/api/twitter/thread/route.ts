import { NextRequest, NextResponse } from "next/server";

function oauthHeader(
  method: string,
  url: string,
  apiKey: string,
  apiSecret: string,
  accessToken: string,
  accessTokenSecret: string
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: Math.random().toString(36).substring(2) + Date.now().toString(36),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: "1.0",
  };

  const sortedParams = Object.keys(oauthParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(oauthParams[k])}`)
    .join("&");

  const baseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams),
  ].join("&");

  const signingKey = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accessTokenSecret)}`;
  const crypto = require("crypto"); // eslint-disable-line @typescript-eslint/no-require-imports
  const hmac = crypto.createHmac("sha1", signingKey);
  hmac.update(baseString);
  const signature = hmac.digest("base64");

  const headerParams: Record<string, string> = { ...oauthParams, oauth_signature: signature };
  const headerStr = Object.keys(headerParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}="${encodeURIComponent(headerParams[k])}"`)
    .join(", ");

  return `OAuth ${headerStr}`;
}

interface ThreadPost {
  content: string;
  mediaIds?: string[];
}

export async function POST(req: NextRequest) {
  try {
    const { apiKey, apiSecret, accessToken, accessTokenSecret, posts }: {
      apiKey: string;
      apiSecret: string;
      accessToken: string;
      accessTokenSecret: string;
      posts: ThreadPost[];
    } = await req.json();

    if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret || !posts?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const url = "https://api.twitter.com/2/tweets";
    const results: { id: string; url: string }[] = [];
    let replyToId: string | null = null;

    for (const post of posts) {
      const authHeader = oauthHeader("POST", url, apiKey, apiSecret, accessToken, accessTokenSecret);

      const body: Record<string, unknown> = { text: post.content };
      if (replyToId) body.reply = { in_reply_to_tweet_id: replyToId };
      if (post.mediaIds?.length) body.media = { media_ids: post.mediaIds };

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.title || `Twitter API error: ${res.status}`);
      }

      const tweetId = data.data?.id;
      replyToId = tweetId;
      results.push({ id: tweetId, url: `https://x.com/i/web/status/${tweetId}` });
    }

    return NextResponse.json({ success: true, posts: results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to post thread";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
