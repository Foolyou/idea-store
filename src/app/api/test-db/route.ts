import { db } from "@/lib/db";

export async function GET() {
  try {
    const r1 = await db.execute("SELECT 1 AS ok");
    const r2 = await db.execute(
      "CREATE TABLE IF NOT EXISTS _test (id INTEGER PRIMARY KEY, msg TEXT)"
    );
    await db.execute("INSERT INTO _test (msg) VALUES ('hello from 灵感宝盒')");
    const r3 = await db.execute("SELECT * FROM _test ORDER BY id DESC LIMIT 1");

    return Response.json({
      ok: true,
      ping: r1.rows[0],
      table: "created",
      row: r3.rows[0],
    });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
