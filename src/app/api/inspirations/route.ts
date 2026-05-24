import { getCurrentUser, requireUser, withErrorHandler, jsonOk, jsonError } from "@/lib/request";
import { getFeed, createInspiration } from "@/lib/queries/inspirations";
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
    return jsonError(parsed.error.issues[0].message, 400);
  }

  const inspiration = await createInspiration(parsed.data, user.id);
  return jsonOk(inspiration, { status: 201 });
});
