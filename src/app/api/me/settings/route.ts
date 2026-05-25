export const runtime = "nodejs";

import { hashPassword, verifyPassword } from "@/lib/password";
import { getUserById, updateUser, checkNicknameUnique } from "@/lib/queries/users";
import { requireUser, withErrorHandler, jsonOk, ConflictError, ValidationError } from "@/lib/request";
import { updateSettingsSchema } from "@/lib/validations";

export const PATCH = withErrorHandler(async (req: Request) => {
  const user = await requireUser();
  const body = await req.json();
  const parsed = updateSettingsSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0].message);
  }

  const { nickname, avatar_url, password } = parsed.data;
  const updates: { nickname?: string; avatar_url?: string | null; password_hash?: string } = {};

  if (nickname && nickname !== user.nickname) {
    const unique = await checkNicknameUnique(nickname, user.id);
    if (!unique) {
      throw new ConflictError("该昵称已被使用");
    }
    updates.nickname = nickname;
  }

  if (avatar_url !== undefined) {
    updates.avatar_url = avatar_url;
  }

  if (password) {
    const currentUser = await getUserById(user.id);
    if (!currentUser) {
      throw new ValidationError("用户不存在");
    }
    const valid = await verifyPassword(password.old, currentUser.password_hash);
    if (!valid) {
      throw new ValidationError("原密码不正确");
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
