import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { bearerToken } = await req.json();

    if (!bearerToken) {
      return NextResponse.json({ error: "Bearer token is required" }, { status: 400 });
    }

    // Use "me" endpoint with bearer token
    const res = await fetch(
      "https://api.twitter.com/2/users/me?user.fields=public_metrics,profile_image_url,name,username",
      {
        headers: { Authorization: `Bearer ${bearerToken}` },
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || data.title || `Twitter API error: ${res.status}`);
    }

    const user = data.data;
    return NextResponse.json({
      handle: `@${user.username}`,
      displayName: user.name,
      avatarUrl: user.profile_image_url,
      followers: user.public_metrics?.followers_count ?? 0,
      following: user.public_metrics?.following_count ?? 0,
      posts: user.public_metrics?.tweet_count ?? 0,
      userId: user.id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to connect";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
