import { getCurrentUser, requireUser, withErrorHandler, jsonOk, NotFoundError } from "@/lib/request";
import { getInspirationById, updateInspiration, deleteInspiration } from "@/lib/queries/inspirations";
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
    return Response.json({ ok: false, error: parsed.error.issues[0].message }, { status: 400 });
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
