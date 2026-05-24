export const runtime = "nodejs";

import { hashPassword, verifyPassword } from "@/lib/password";
import { getUserByNickname, updateUser, checkNicknameUnique } from "@/lib/queries/users";
import { requireUser, withErrorHandler, jsonOk, jsonError, ConflictError } from "@/lib/request";
import { updateSettingsSchema } from "@/lib/validations";

export const PATCH = withErrorHandler(async (req: Request) => {
  const user = await requireUser();
  const body = await req.json();
  const parsed = updateSettingsSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0].message, 400);
  }

  const { nickname, avatar_url, password } = parsed.data;
  const updates: { nickname?: string; avatar_url?: string | null; password_hash?: string } = {};

  // Handle nickname update
  if (nickname && nickname !== user.nickname) {
    const unique = await checkNicknameUnique(nickname, user.id);
    if (!unique) {
      throw new ConflictError("该昵称已被使用");
    }
    updates.nickname = nickname;
  }

  // Handle avatar update (allow setting to null)
  if (avatar_url !== undefined) {
    updates.avatar_url = avatar_url;
  }

  // Handle password update
  if (password) {
    const currentUser = await getUserByNickname(user.nickname);
    if (!currentUser) {
      return jsonError("用户不存在", 404);
    }
    const valid = await verifyPassword(password.old, currentUser.password_hash);
    if (!valid) {
      return jsonError("原密码不正确", 400);
    }
    updates.password_hash = await hashPassword(password.new);
  }

  await updateUser(user.id, updates);

  return jsonOk({
    user: {
      id: user.id,
      nickname: updates.nickname ?? user.nickname,
      avatar_url: updates.avatar_url !== undefined ? updates.avatar_url : user.avatar_url,
    },
  });
});
