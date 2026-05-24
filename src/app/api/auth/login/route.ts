export const runtime = "nodejs";

import { createSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { getUserByNickname } from "@/lib/queries/users";
import { withErrorHandler, jsonOk, jsonError } from "@/lib/request";
import { loginSchema } from "@/lib/validations";

export const POST = withErrorHandler(async (req: Request) => {
  const body = await req.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0].message, 400);
  }

  const { nickname, password } = parsed.data;
  const user = await getUserByNickname(nickname);

  if (!user) {
    return jsonError("昵称或密码错误", 401);
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return jsonError("昵称或密码错误", 401);
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
