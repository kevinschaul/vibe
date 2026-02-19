import { NextRequest, NextResponse } from "next/server";
import { BskyAgent } from "@atproto/api";

export async function POST(req: NextRequest) {
  try {
    const { handle, appPassword } = await req.json();

    if (!handle || !appPassword) {
      return NextResponse.json(
        { error: "Handle and app password are required" },
        { status: 400 }
      );
    }

    const agent = new BskyAgent({ service: "https://bsky.social" });
    await agent.login({ identifier: handle, password: appPassword });

    const profile = await agent.getProfile({ actor: agent.session!.did });

    return NextResponse.json({
      handle: profile.data.handle,
      displayName: profile.data.displayName || profile.data.handle,
      avatarUrl: profile.data.avatar,
      followers: profile.data.followersCount ?? 0,
      following: profile.data.followsCount ?? 0,
      posts: profile.data.postsCount ?? 0,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to connect";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
