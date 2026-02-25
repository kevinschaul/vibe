import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { instance, accessToken } = await req.json();

    const baseUrl = instance.startsWith("http")
      ? instance
      : `https://${instance}`;

    // Get account ID first
    const meRes = await fetch(`${baseUrl}/api/v1/accounts/verify_credentials`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const me = await meRes.json();

    const res = await fetch(
      `${baseUrl}/api/v1/accounts/${me.id}/statuses?limit=20&exclude_replies=false`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!res.ok) throw new Error(`Mastodon API error: ${res.status}`);

    const statuses = await res.json();

    const posts = statuses.map((s: {
      id: string;
      content: string;
      url: string;
      favourites_count: number;
      reblogs_count: number;
      replies_count: number;
      created_at: string;
    }) => ({
      id: s.id,
      content: s.content.replace(/<[^>]+>/g, ""), // strip HTML tags
      url: s.url,
      likes: s.favourites_count ?? 0,
      reposts: s.reblogs_count ?? 0,
      replies: s.replies_count ?? 0,
      createdAt: s.created_at,
    }));

    return NextResponse.json({ posts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch feed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
