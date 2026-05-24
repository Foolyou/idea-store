import { requireUser, withErrorHandler, jsonOk, NotFoundError } from "@/lib/request";
import { getInspirationById } from "@/lib/queries/inspirations";
import { toggleBookmark } from "@/lib/queries/interactions";

export const POST = withErrorHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const user = await requireUser();

  const inspiration = await getInspirationById(id, user.id);
  if (!inspiration) {
    throw new NotFoundError("灵感");
  }

  const result = await toggleBookmark(user.id, id);
  return jsonOk({ bookmarked: result.bookmarked, bookmark_count: result.bookmark_count });
});
