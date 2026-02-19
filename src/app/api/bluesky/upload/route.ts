import { NextRequest, NextResponse } from "next/server";
import { BskyAgent } from "@atproto/api";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const handle = formData.get("handle") as string;
    const appPassword = formData.get("appPassword") as string;
    const file = formData.get("file") as File;

    if (!handle || !appPassword || !file) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const agent = new BskyAgent({ service: "https://bsky.social" });
    await agent.login({ identifier: handle, password: appPassword });

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await agent.uploadBlob(buffer, { encoding: file.type });

    return NextResponse.json({
      blob: result.data.blob,
      mimeType: file.type,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
