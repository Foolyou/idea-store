import { withErrorHandler, jsonOk } from "@/lib/request";
import { getCircleMembers } from "@/lib/queries/circles";
import { paginationSchema } from "@/lib/validations";

export const GET = withErrorHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const url = new URL(req.url);
  const parsed = paginationSchema.parse({
    cursor: url.searchParams.get("cursor") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  const result = await getCircleMembers(id, parsed);
  return jsonOk(result);
});
