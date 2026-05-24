import { getCurrentUser, withErrorHandler, jsonOk, NotFoundError } from "@/lib/request";
import { getCircleById } from "@/lib/queries/circles";

export const GET = withErrorHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const user = await getCurrentUser();
  const circle = await getCircleById(id, user?.id ?? null);

  if (!circle) {
    throw new NotFoundError("圈子");
  }

  return jsonOk(circle);
});
