import { getCurrentUser, requireUser, withErrorHandler, jsonOk, ValidationError, ForbiddenError } from "@/lib/request";
import { getFeed, createInspiration } from "@/lib/queries/inspirations";
import { isCircleMember } from "@/lib/queries/circles";
import { createInspirationSchema, paginationSchema } from "@/lib/validations";

export const GET = withErrorHandler(async (req: Request) => {
  const url = new URL(req.url);
  const params = paginationSchema.parse({
    cursor: url.searchParams.get("cursor") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  const user = await getCurrentUser();
  const result = await getFeed(user?.id ?? null, params);
  return jsonOk(result);
});

export const POST = withErrorHandler(async (req: Request) => {
  const user = await requireUser();
  const body = await req.json();
  const parsed = createInspirationSchema.safeParse(body);

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

  const inspiration = await createInspiration(parsed.data, user.id);
  return jsonOk(inspiration, { status: 201 });
});
