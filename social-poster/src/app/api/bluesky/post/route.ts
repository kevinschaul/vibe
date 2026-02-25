import { NextRequest, NextResponse } from "next/server";
import { BskyAgent, RichText } from "@atproto/api";

export async function POST(req: NextRequest) {
  try {
    const { handle, appPassword, content } = await req.json();

    if (!handle || !appPassword || !content) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const agent = new BskyAgent({ service: "https://bsky.social" });
    await agent.login({ identifier: handle, password: appPassword });

    const rt = new RichText({ text: content });
    await rt.detectFacets(agent);

    const result = await agent.post({
      text: rt.text,
      facets: rt.facets,
      createdAt: new Date().toISOString(),
    });

    // Build post URL from the AT URI
    const uri = result.uri; // at://did:plc:.../app.bsky.feed.post/rkey
    const parts = uri.split("/");
    const rkey = parts[parts.length - 1];
    const postUrl = `https://bsky.app/profile/${handle}/post/${rkey}`;

    return NextResponse.json({ success: true, postId: result.uri, url: postUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to post";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
