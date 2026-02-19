import { NextRequest, NextResponse } from "next/server";
import { BskyAgent } from "@atproto/api";

export async function POST(req: NextRequest) {
  try {
    const { handle, appPassword } = await req.json();

    const agent = new BskyAgent({ service: "https://bsky.social" });
    await agent.login({ identifier: handle, password: appPassword });

    const authorFeed = await agent.getAuthorFeed({
      actor: agent.session!.did,
      limit: 20,
    });

    const posts = authorFeed.data.feed
      .filter((item) => item.post.author.did === agent.session!.did)
      .map((item) => {
        const post = item.post;
        const record = post.record as { text?: string };
        const parts = post.uri.split("/");
        const rkey = parts[parts.length - 1];
        return {
          id: post.uri,
          content: record.text ?? "",
          url: `https://bsky.app/profile/${handle}/post/${rkey}`,
          likes: post.likeCount ?? 0,
          reposts: post.repostCount ?? 0,
          replies: post.replyCount ?? 0,
          createdAt: post.indexedAt,
        };
      });

    return NextResponse.json({ posts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch feed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
