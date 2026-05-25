export const runtime = "nodejs";

import { createSession } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { createUser, checkNicknameUnique } from "@/lib/queries/users";
import { withErrorHandler, jsonOk, ConflictError, ValidationError, RateLimitError, rateLimit } from "@/lib/request";
import { registerSchema } from "@/lib/validations";

export const POST = withErrorHandler(async (req: Request) => {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(`register:${ip}`, 5, 60_000)) {
    throw new RateLimitError();
  }

  const body = await req.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0].message);
  }

  const { nickname, password } = parsed.data;

  const unique = await checkNicknameUnique(nickname);
  if (!unique) {
    throw new ConflictError("该昵称已被使用");
  }

  const hash = await hashPassword(password);
  let user;
  try {
    user = await createUser(nickname, hash);
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("UNIQUE constraint failed")) {
      throw new ConflictError("该昵称已被使用");
    }
    throw e;
  }
  await createSession(user.id);

  return jsonOk({ user }, { status: 201 });
});
