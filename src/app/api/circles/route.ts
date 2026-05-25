import { getCurrentUser, requireUser, withErrorHandler, jsonOk, ValidationError, ConflictError } from "@/lib/request";
import { listCircles, createCircle } from "@/lib/queries/circles";
import { createCircleSchema, searchSchema } from "@/lib/validations";

export const GET = withErrorHandler(async (req: Request) => {
  const url = new URL(req.url);
  const params = searchSchema.parse({
    search: url.searchParams.get("search") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  const user = await getCurrentUser();
  const result = await listCircles(params.search, user?.id ?? null, params);
  return jsonOk(result);
});

export const POST = withErrorHandler(async (req: Request) => {
  const user = await requireUser();
  const body = await req.json();
  const parsed = createCircleSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0].message);
  }

  // Use exact match for uniqueness check (not LIKE fuzzy match)
  try {
    const circle = await createCircle(parsed.data.name, parsed.data.description ?? "", user.id);
    return jsonOk(circle, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("UNIQUE constraint failed")) {
      throw new ConflictError("该圈子名已存在");
    }
    throw e;
  }
});
