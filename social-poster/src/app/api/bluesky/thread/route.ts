import { NextRequest, NextResponse } from "next/server";
import { BskyAgent, RichText } from "@atproto/api";

interface ThreadPost {
  content: string;
  imageBlobs?: {
    $type: string;
    ref: { $link: string };
    mimeType: string;
    size: number;
  }[];
}

export async function POST(req: NextRequest) {
  try {
    const { handle, appPassword, posts }: { handle: string; appPassword: string; posts: ThreadPost[] } = await req.json();

    if (!handle || !appPassword || !posts?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const agent = new BskyAgent({ service: "https://bsky.social" });
    await agent.login({ identifier: handle, password: appPassword });

    const results: { uri: string; cid: string; url: string }[] = [];
    let parentRef: { uri: string; cid: string } | null = null;
    let rootRef: { uri: string; cid: string } | null = null;

    for (const post of posts) {
      const rt = new RichText({ text: post.content });
      await rt.detectFacets(agent);

      const record: Record<string, unknown> = {
        text: rt.text,
        facets: rt.facets,
        createdAt: new Date().toISOString(),
      };

      if (post.imageBlobs?.length) {
        record.embed = {
          $type: "app.bsky.embed.images",
          images: post.imageBlobs.map((blob) => ({
            image: blob,
            alt: "",
          })),
        };
      }

      if (parentRef && rootRef) {
        record.reply = {
          root: rootRef,
          parent: parentRef,
        };
      }

      const result = await agent.post(record as Parameters<typeof agent.post>[0]);
      const ref = { uri: result.uri, cid: result.cid };

      if (!rootRef) rootRef = ref;
      parentRef = ref;

      const parts = result.uri.split("/");
      const rkey = parts[parts.length - 1];
      results.push({ ...ref, url: `https://bsky.app/profile/${handle}/post/${rkey}` });
    }

    return NextResponse.json({ success: true, posts: results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to post thread";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
