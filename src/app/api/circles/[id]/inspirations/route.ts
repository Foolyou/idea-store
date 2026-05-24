import { getCurrentUser, withErrorHandler, jsonOk } from "@/lib/request";
import { getCircleInspirations } from "@/lib/queries/circles";
import { paginationSchema } from "@/lib/validations";

export const GET = withErrorHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const url = new URL(req.url);
  const parsed = paginationSchema.parse({
    cursor: url.searchParams.get("cursor") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  const user = await getCurrentUser();
  const result = await getCircleInspirations(id, user?.id ?? null, parsed);
  return jsonOk(result);
});
