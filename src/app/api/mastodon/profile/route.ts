import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { instance, accessToken } = await req.json();

    if (!instance || !accessToken) {
      return NextResponse.json(
        { error: "Instance and access token are required" },
        { status: 400 }
      );
    }

    const baseUrl = instance.startsWith("http")
      ? instance
      : `https://${instance}`;

    const res = await fetch(`${baseUrl}/api/v1/accounts/verify_credentials`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Mastodon API error: ${res.status}`);
    }

    const data = await res.json();

    return NextResponse.json({
      handle: `${data.username}@${new URL(baseUrl).hostname}`,
      displayName: data.display_name || data.username,
      avatarUrl: data.avatar,
      followers: data.followers_count ?? 0,
      following: data.following_count ?? 0,
      posts: data.statuses_count ?? 0,
      acct: data.acct,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to connect";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
