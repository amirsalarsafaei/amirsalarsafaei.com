import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

/**
 * Called by the admin UI after a blog is created, updated or published so the
 * public ISR pages reflect it immediately instead of waiting for the 5-minute
 * revalidation window.
 */
export async function POST(request: NextRequest) {
  const expectedToken = process.env.AUTH_TOKEN;
  const providedToken = request.headers.get("authorization") ?? "";

  if (!expectedToken || providedToken !== expectedToken) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  let id: string | undefined;

  try {
    const body = await request.json();
    if (typeof body?.id === "string" && body.id.length > 0) {
      id = body.id;
    }
  } catch {
    // An id is optional; the listing can still be revalidated.
  }

  revalidatePath("/blogs");
  // Keep sitemap.xml in step with publish/unpublish instead of waiting for its
  // own 5-minute window — it is the primary way crawlers discover new posts.
  revalidatePath("/sitemap.xml");

  if (id) {
    revalidatePath(`/blogs/${id}`);
  }

  return NextResponse.json({
    ok: true,
    revalidated: id
      ? ["/blogs", `/blogs/${id}`, "/sitemap.xml"]
      : ["/blogs", "/sitemap.xml"],
  });
}
