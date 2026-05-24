import { requireUser, withErrorHandler, jsonOk } from "@/lib/request";
import { getMyCircles } from "@/lib/queries/circles";

export const GET = withErrorHandler(async () => {
  const user = await requireUser();
  const circles = await getMyCircles(user.id);
  return jsonOk({ items: circles });
});
