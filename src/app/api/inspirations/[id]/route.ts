import { getCurrentUser, requireUser, withErrorHandler, jsonOk, ValidationError, ForbiddenError, NotFoundError } from "@/lib/request";
import { getInspirationById, updateInspiration, deleteInspiration } from "@/lib/queries/inspirations";
import { isCircleMember } from "@/lib/queries/circles";
import { updateInspirationSchema } from "@/lib/validations";

export const GET = withErrorHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const user = await getCurrentUser();
  const inspiration = await getInspirationById(id, user?.id ?? null);

  if (!inspiration) {
    throw new NotFoundError("灵感");
  }

  return jsonOk(inspiration);
});

export const PATCH = withErrorHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const user = await requireUser();
  const body = await req.json();
  const parsed = updateInspirationSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0].message);
  }

  // If setting circle visibility, verify membership
  if (parsed.data.visibility === "circle" && parsed.data.circle_id) {
    const member = await isCircleMember(parsed.data.circle_id, user.id);
    if (!member) {
      throw new ForbiddenError("你不是该圈子成员");
    }
  }

  const inspiration = await updateInspiration(id, user.id, parsed.data);

  if (!inspiration) {
    throw new NotFoundError("灵感");
  }

  return jsonOk(inspiration);
});

export const DELETE = withErrorHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const user = await requireUser();
  const deleted = await deleteInspiration(id, user.id);

  if (!deleted) {
    throw new NotFoundError("灵感");
  }

  return jsonOk(undefined);
});
