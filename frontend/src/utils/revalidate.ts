/**
 * Ask the Next server to drop the cached public pages for a blog. Failures are
 * non-fatal: the pages would still refresh on the next ISR window.
 */
export async function revalidateBlog(
  token: string | null,
  id?: string,
): Promise<void> {
  if (!token) return;

  try {
    await fetch("/api/revalidate", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: token,
      },
      body: JSON.stringify({ id }),
    });
  } catch (error) {
    console.error("Failed to revalidate blog pages:", error);
  }
}
