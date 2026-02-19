import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { instance, accessToken, content, visibility = "public" } = await req.json();

    if (!instance || !accessToken || !content) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const baseUrl = instance.startsWith("http")
      ? instance
      : `https://${instance}`;

    const res = await fetch(`${baseUrl}/api/v1/statuses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: content, visibility }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Mastodon API error: ${res.status}`);
    }

    const data = await res.json();

    return NextResponse.json({
      success: true,
      postId: data.id,
      url: data.url,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to post";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
