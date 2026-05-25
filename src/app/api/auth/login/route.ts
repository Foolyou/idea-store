export const runtime = "nodejs";

import { createSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { getUserByNickname } from "@/lib/queries/users";
import { withErrorHandler, jsonOk, ValidationError, RateLimitError, rateLimit } from "@/lib/request";
import { loginSchema } from "@/lib/validations";

export const POST = withErrorHandler(async (req: Request) => {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(`login:${ip}`, 10, 60_000)) {
    throw new RateLimitError();
  }

  const body = await req.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0].message);
  }

  const { nickname, password } = parsed.data;
  const user = await getUserByNickname(nickname);

  if (!user) {
    throw new ValidationError("昵称或密码错误");
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    throw new ValidationError("昵称或密码错误");
  }

  await createSession(user.id);

  return jsonOk({
    user: {
      id: user.id,
      nickname: user.nickname,
      avatar_url: user.avatar_url,
    },
  });
});
