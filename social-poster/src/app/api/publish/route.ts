import { NextRequest, NextResponse } from "next/server";

interface PublishRequest {
  platforms: {
    bluesky?: {
      enabled: boolean;
      posts: { content: string; imageBlobs?: unknown[] }[];
      credentials: { handle: string; appPassword: string };
    };
    mastodon?: {
      enabled: boolean;
      posts: { content: string; mediaIds?: string[] }[];
      credentials: { instance: string; accessToken: string };
      visibility?: string;
    };
    twitter?: {
      enabled: boolean;
      posts: { content: string; mediaIds?: string[] }[];
      credentials: {
        apiKey: string;
        apiSecret: string;
        accessToken: string;
        accessTokenSecret: string;
      };
    };
    blog?: {
      enabled: boolean;
      credentials: {
        type: string;
        url: string;
        username?: string;
        password?: string;
        apiKey?: string;
        webhookUrl?: string;
      };
      title: string;
      content: string;
      slug?: string;
      tags?: string[];
    };
  };
}

export async function POST(req: NextRequest) {
  const body: PublishRequest = await req.json();
  const { platforms } = body;

  const results: Record<string, unknown> = {};
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  const jobs: Promise<void>[] = [];

  if (platforms.bluesky?.enabled && platforms.bluesky.credentials) {
    const { credentials, posts } = platforms.bluesky;
    jobs.push(
      fetch(`${baseUrl}/api/bluesky/thread`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...credentials, posts }),
      })
        .then((r) => r.json())
        .then((data) => {
          results.bluesky = data;
        })
        .catch((e) => {
          results.bluesky = { error: e.message };
        })
    );
  }

  if (platforms.mastodon?.enabled && platforms.mastodon.credentials) {
    const { credentials, posts, visibility } = platforms.mastodon;
    jobs.push(
      fetch(`${baseUrl}/api/mastodon/thread`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...credentials, posts, visibility }),
      })
        .then((r) => r.json())
        .then((data) => {
          results.mastodon = data;
        })
        .catch((e) => {
          results.mastodon = { error: e.message };
        })
    );
  }

  if (platforms.twitter?.enabled && platforms.twitter.credentials) {
    const { credentials, posts } = platforms.twitter;
    jobs.push(
      fetch(`${baseUrl}/api/twitter/thread`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...credentials, posts }),
      })
        .then((r) => r.json())
        .then((data) => {
          results.twitter = data;
        })
        .catch((e) => {
          results.twitter = { error: e.message };
        })
    );
  }

  if (platforms.blog?.enabled && platforms.blog.credentials) {
    const { credentials, title, content, slug, tags } = platforms.blog;
    jobs.push(
      fetch(`${baseUrl}/api/blog/post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...credentials, title, content, slug, tags }),
      })
        .then((r) => r.json())
        .then((data) => {
          results.blog = data;
        })
        .catch((e) => {
          results.blog = { error: e.message };
        })
    );
  }

  await Promise.all(jobs);

  return NextResponse.json({ results });
}
