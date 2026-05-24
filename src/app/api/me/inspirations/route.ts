import { requireUser, withErrorHandler, jsonOk } from "@/lib/request";
import { getMyInspirations } from "@/lib/queries/inspirations";
import { paginationSchema } from "@/lib/validations";

export const GET = withErrorHandler(async (req: Request) => {
  const user = await requireUser();
  const url = new URL(req.url);
  const params = paginationSchema.parse({
    cursor: url.searchParams.get("cursor") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  const result = await getMyInspirations(user.id, params);
  return jsonOk(result);
});
