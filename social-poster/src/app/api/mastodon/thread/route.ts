import { NextRequest, NextResponse } from "next/server";

interface ThreadPost {
  content: string;
  mediaIds?: string[];
}

export async function POST(req: NextRequest) {
  try {
    const {
      instance,
      accessToken,
      posts,
      visibility = "public",
    }: { instance: string; accessToken: string; posts: ThreadPost[]; visibility?: string } = await req.json();

    if (!instance || !accessToken || !posts?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const baseUrl = instance.startsWith("http") ? instance : `https://${instance}`;

    const results: { id: string; url: string }[] = [];
    let inReplyToId: string | null = null;

    for (const post of posts) {
      const body: Record<string, unknown> = {
        status: post.content,
        visibility,
      };
      if (inReplyToId) body.in_reply_to_id = inReplyToId;
      if (post.mediaIds?.length) body.media_ids = post.mediaIds;

      const res = await fetch(`${baseUrl}/api/v1/statuses`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Mastodon API error: ${res.status}`);
      }

      const data = await res.json();
      inReplyToId = data.id;
      results.push({ id: data.id, url: data.url });
    }

    return NextResponse.json({ success: true, posts: results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to post thread";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
