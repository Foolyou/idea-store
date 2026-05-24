import { getCurrentUser, withErrorHandler, jsonOk } from "@/lib/request";

export const GET = withErrorHandler(async () => {
  const user = await getCurrentUser();

  if (!user) {
    return jsonOk({ user: null });
  }

  return jsonOk({
    user: {
      id: user.id,
      nickname: user.nickname,
      avatar_url: user.avatar_url,
      last_visibility: user.last_visibility,
      last_circle_id: user.last_circle_id,
      created_at: "", // getCurrentUser doesn't return created_at; callers needing full profile can use getUserById
    },
  });
});
