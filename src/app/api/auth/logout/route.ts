import { destroySession } from "@/lib/auth";
import { withErrorHandler, jsonOk } from "@/lib/request";

export const POST = withErrorHandler(async () => {
  await destroySession();
  return jsonOk(undefined);
});
