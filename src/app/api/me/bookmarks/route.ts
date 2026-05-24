import { requireUser, withErrorHandler, jsonOk } from "@/lib/request";
import { getMyBookmarks } from "@/lib/queries/stats";
import { paginationSchema } from "@/lib/validations";

export const GET = withErrorHandler(async (req: Request) => {
  const user = await requireUser();
  const url = new URL(req.url);
  const parsed = paginationSchema.parse({
    cursor: url.searchParams.get("cursor") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  const result = await getMyBookmarks(user.id, parsed);
  return jsonOk(result);
});
