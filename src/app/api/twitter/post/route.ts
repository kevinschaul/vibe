import { NextRequest, NextResponse } from "next/server";

// Twitter/X API v2 posting
// Uses OAuth 1.0a user context (accessToken + accessTokenSecret)
function oauthHeader(
  method: string,
  url: string,
  apiKey: string,
  apiSecret: string,
  accessToken: string,
  accessTokenSecret: string,
  extraParams: Record<string, string> = {}
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: Math.random().toString(36).substring(2) + Date.now().toString(36),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: "1.0",
  };

  const allParams = { ...oauthParams, ...extraParams };
  const sortedParams = Object.keys(allParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`)
    .join("&");

  const baseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams),
  ].join("&");

  const signingKey = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accessTokenSecret)}`;

  // Use Web Crypto for HMAC-SHA1
  const encoder = new TextEncoder();
  const keyData = encoder.encode(signingKey);
  const msgData = encoder.encode(baseString);

  // We'll do synchronous HMAC via a simplified approach using Node crypto
  // Note: In production use a proper OAuth library
  const crypto = require("crypto"); // eslint-disable-line @typescript-eslint/no-require-imports
  const hmac = crypto.createHmac("sha1", signingKey);
  hmac.update(baseString);
  const signature = hmac.digest("base64");

  // Suppress unused variable warning
  void keyData;
  void msgData;

  const headerParams: Record<string, string> = { ...oauthParams, oauth_signature: signature };
  const headerStr = Object.keys(headerParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}="${encodeURIComponent(headerParams[k])}"`)
    .join(", ");

  return `OAuth ${headerStr}`;
}

export async function POST(req: NextRequest) {
  try {
    const { apiKey, apiSecret, accessToken, accessTokenSecret, content, mediaIds } = await req.json();

    if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const url = "https://api.twitter.com/2/tweets";
    const authHeader = oauthHeader("POST", url, apiKey, apiSecret, accessToken, accessTokenSecret);

    const body: Record<string, unknown> = { text: content };
    if (mediaIds?.length) {
      body.media = { media_ids: mediaIds };
    }

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
    return NextResponse.json({
      success: true,
      postId: tweetId,
      url: tweetId ? `https://x.com/i/web/status/${tweetId}` : undefined,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to post";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
