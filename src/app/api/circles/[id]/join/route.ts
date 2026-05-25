import { requireUser, withErrorHandler, jsonOk, NotFoundError, ConflictError, RateLimitError, rateLimit } from "@/lib/request";
import { joinCircle, leaveCircle, getCircleById } from "@/lib/queries/circles";

export const POST = withErrorHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const user = await requireUser();

  const circle = await getCircleById(id, null);
  if (!circle) {
    throw new NotFoundError("圈子");
  }

  const result = await joinCircle(id, user.id);
  if (!result.joined) {
    throw new ConflictError("已经是圈子成员");
  }

  return jsonOk({ joined: true });
});

export const DELETE = withErrorHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const user = await requireUser();

  const circle = await getCircleById(id, null);
  if (!circle) {
    throw new NotFoundError("圈子");
  }

  const result = await leaveCircle(id, user.id);
  if (!result.left) {
    throw new ConflictError("无法退出圈子（创建者不可退出）");
  }

  return jsonOk({ left: true });
});
