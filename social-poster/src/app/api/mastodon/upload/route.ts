import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const instance = formData.get("instance") as string;
    const accessToken = formData.get("accessToken") as string;
    const file = formData.get("file") as File;

    if (!instance || !accessToken || !file) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const baseUrl = instance.startsWith("http") ? instance : `https://${instance}`;

    const uploadForm = new FormData();
    uploadForm.append("file", file);

    const res = await fetch(`${baseUrl}/api/v2/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: uploadForm,
    });

    if (!res.ok) {
      throw new Error(`Upload failed: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json({ mediaId: data.id, url: data.url, previewUrl: data.preview_url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
