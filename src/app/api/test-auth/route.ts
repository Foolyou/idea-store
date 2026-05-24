export const runtime = "nodejs";

import { hashPassword, verifyPassword } from "@/lib/password";
import { createSession, destroySession } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonOk, jsonError } from "@/lib/request";

export async function GET() {
  const results: Record<string, unknown> = {};

  // Test 1: Password hashing
  const hash = await hashPassword("test123456");
  results.password = {
    hashLength: hash.length,
    looksLikeBcrypt: hash.startsWith("$2"),
  };

  // Test 2: Password verification (correct)
  const valid = await verifyPassword("test123456", hash);
  results.verifyCorrect = valid;

  // Test 3: Password verification (wrong)
  const invalid = await verifyPassword("wrong", hash);
  results.verifyWrong = !invalid;

  // Test 4: Create test user + session
  const userId = crypto.randomUUID();
  await db.execute({
    sql: "INSERT OR REPLACE INTO users (id, nickname, password_hash) VALUES (?, ?, ?)",
    args: [userId, "_test_user_" + Date.now(), hash],
  });

  const token = await createSession(userId);
  results.sessionCreated = typeof token === "string" && token.length > 0;

  // Test 5: Verify session exists in DB
  const r = await db.execute({
    sql: "SELECT user_id FROM sessions WHERE id = ?",
    args: [token],
  });
  results.sessionInDb = r.rows.length === 1;

  // Test 6: Cleanup
  await destroySession();
  const r2 = await db.execute({
    sql: "SELECT user_id FROM sessions WHERE id = ?",
    args: [token],
  });
  results.sessionDestroyed = r2.rows.length === 0;

  // Cleanup test user
  await db.execute({ sql: "DELETE FROM users WHERE id = ?", args: [userId] });

  const allPassed = Object.values(results).every(Boolean);
  results.allPassed = allPassed;

  if (!allPassed) {
    return jsonError("Some tests failed", 500);
  }

  return jsonOk(results);
}
