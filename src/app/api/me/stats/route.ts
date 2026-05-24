import { requireUser, withErrorHandler, jsonOk } from "@/lib/request";
import { getUserStats } from "@/lib/queries/stats";

export const GET = withErrorHandler(async () => {
  const user = await requireUser();
  const stats = await getUserStats(user.id);
  return jsonOk(stats);
});
