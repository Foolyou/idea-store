import { db } from "../db";

export async function toggleLike(
  userId: string,
  inspirationId: string
): Promise<{ liked: boolean; like_count: number }> {
  const txn = await db.transaction("write");

  try {
    const existing = await txn.execute({
      sql: "SELECT 1 FROM likes WHERE user_id = ? AND inspiration_id = ?",
      args: [userId, inspirationId],
    });

    if (existing.rows.length > 0) {
      await txn.execute({
        sql: "DELETE FROM likes WHERE user_id = ? AND inspiration_id = ?",
        args: [userId, inspirationId],
      });
      await txn.execute({
        sql: "UPDATE inspirations SET like_count = MAX(0, like_count - 1) WHERE id = ?",
        args: [inspirationId],
      });
      const r = await txn.execute({
        sql: "SELECT like_count FROM inspirations WHERE id = ?",
        args: [inspirationId],
      });
      await txn.commit();
      return { liked: false, like_count: r.rows[0].like_count as number };
    } else {
      await txn.execute({
        sql: "INSERT INTO likes (user_id, inspiration_id) VALUES (?, ?)",
        args: [userId, inspirationId],
      });
      await txn.execute({
        sql: "UPDATE inspirations SET like_count = like_count + 1 WHERE id = ?",
        args: [inspirationId],
      });
      const r = await txn.execute({
        sql: "SELECT like_count FROM inspirations WHERE id = ?",
        args: [inspirationId],
      });
      await txn.commit();
      return { liked: true, like_count: r.rows[0].like_count as number };
    }
  } catch (e) {
    await txn.rollback();
    throw e;
  }
}

export async function toggleBookmark(
  userId: string,
  inspirationId: string
): Promise<{ bookmarked: boolean; bookmark_count: number }> {
  const txn = await db.transaction("write");

  try {
    const existing = await txn.execute({
      sql: "SELECT 1 FROM bookmarks WHERE user_id = ? AND inspiration_id = ?",
      args: [userId, inspirationId],
    });

    if (existing.rows.length > 0) {
      await txn.execute({
        sql: "DELETE FROM bookmarks WHERE user_id = ? AND inspiration_id = ?",
        args: [userId, inspirationId],
      });
      await txn.execute({
        sql: "UPDATE inspirations SET bookmark_count = MAX(0, bookmark_count - 1) WHERE id = ?",
        args: [inspirationId],
      });
      const r = await txn.execute({
        sql: "SELECT bookmark_count FROM inspirations WHERE id = ?",
        args: [inspirationId],
      });
      await txn.commit();
      return { bookmarked: false, bookmark_count: r.rows[0].bookmark_count as number };
    } else {
      await txn.execute({
        sql: "INSERT INTO bookmarks (user_id, inspiration_id) VALUES (?, ?)",
        args: [userId, inspirationId],
      });
      await txn.execute({
        sql: "UPDATE inspirations SET bookmark_count = bookmark_count + 1 WHERE id = ?",
        args: [inspirationId],
      });
      const r = await txn.execute({
        sql: "SELECT bookmark_count FROM inspirations WHERE id = ?",
        args: [inspirationId],
      });
      await txn.commit();
      return { bookmarked: true, bookmark_count: r.rows[0].bookmark_count as number };
    }
  } catch (e) {
    await txn.rollback();
    throw e;
  }
}
