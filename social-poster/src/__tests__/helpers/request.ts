import { NextRequest } from "next/server";

/**
 * Creates a NextRequest with a JSON body for testing POST handlers.
 */
export function makeJsonRequest(body: unknown, url = "http://localhost/api/test"): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Creates a NextRequest with a FormData body for testing upload handlers.
 */
export function makeFormRequest(
  fields: Record<string, string | File>,
  url = "http://localhost/api/test"
): NextRequest {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return new NextRequest(url, { method: "POST", body: formData });
}

/**
 * Reads the JSON body from a NextResponse.
 */
export async function readJson(res: Response): Promise<unknown> {
  return res.json();
}
