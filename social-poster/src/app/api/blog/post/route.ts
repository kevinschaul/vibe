import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { type, url, username, password, apiKey, webhookUrl, title, content, slug, tags } =
      await req.json();

    if (type === "wordpress") {
      // WordPress REST API
      const credentials = Buffer.from(`${username}:${password}`).toString("base64");
      const postData: Record<string, unknown> = {
        title,
        content,
        status: "publish",
      };
      if (slug) postData.slug = slug;
      if (tags?.length) postData.tags = tags;

      const baseUrl = url.replace(/\/$/, "");
      const res = await fetch(`${baseUrl}/wp-json/wp/v2/posts`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(postData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `WordPress API error: ${res.status}`);
      }

      return NextResponse.json({ success: true, postId: data.id, url: data.link });
    }

    if (type === "ghost") {
      // Ghost Admin API
      const ghostUrl = url.replace(/\/$/, "");

      // Create JWT for Ghost Admin API
      const [keyId, keySecret] = apiKey!.split(":");
      const crypto = require("crypto"); // eslint-disable-line @typescript-eslint/no-require-imports
      const header = Buffer.from(JSON.stringify({ alg: "HS256", kid: keyId, typ: "JWT" })).toString("base64url");
      const payload = Buffer.from(
        JSON.stringify({ iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 300, aud: "/admin/" })
      ).toString("base64url");
      const token = `${header}.${payload}`;
      const sig = crypto.createHmac("sha256", Buffer.from(keySecret, "hex")).update(token).digest("base64url");
      const jwt = `${token}.${sig}`;

      const postData: Record<string, unknown> = {
        posts: [
          {
            title,
            html: content,
            status: "published",
            ...(slug ? { slug } : {}),
            ...(tags?.length ? { tags: tags.map((t: string) => ({ name: t })) } : {}),
          },
        ],
      };

      const res = await fetch(`${ghostUrl}/ghost/api/admin/posts/`, {
        method: "POST",
        headers: {
          Authorization: `Ghost ${jwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(postData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.errors?.[0]?.message || `Ghost API error: ${res.status}`);
      }

      const post = data.posts?.[0];
      return NextResponse.json({ success: true, postId: post.id, url: post.url });
    }

    if (type === "webhook") {
      // Generic webhook
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, slug, tags }),
      });

      if (!res.ok) {
        throw new Error(`Webhook error: ${res.status}`);
      }

      const data = await res.json().catch(() => ({}));
      return NextResponse.json({ success: true, url: data.url });
    }

    return NextResponse.json({ error: "Unknown blog type" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to post";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
