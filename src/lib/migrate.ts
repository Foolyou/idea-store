import { db } from "./db";
import { readFileSync } from "fs";
import { join } from "path";

async function migrate() {
  const schemaPath = join(__dirname, "schema.sql");
  const sql = readFileSync(schemaPath, "utf-8");

  // Remove SQL comments (lines starting with --)
  const cleaned = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  // Split into individual statements
  const statements = cleaned
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Disable FK checks to handle circular references (users <-> circles)
  await db.execute("PRAGMA foreign_keys = OFF");

  // Drop existing tables (reverse dependency order)
  await db.execute("DROP TABLE IF EXISTS bookmarks");
  await db.execute("DROP TABLE IF EXISTS likes");
  await db.execute("DROP TABLE IF EXISTS circle_members");
  await db.execute("DROP TABLE IF EXISTS sessions");
  await db.execute("DROP TABLE IF EXISTS inspirations");
  await db.execute("DROP TABLE IF EXISTS circles");
  await db.execute("DROP TABLE IF EXISTS users");

  for (const stmt of statements) {
    const preview = stmt.replace(/\s+/g, " ").substring(0, 80);
    console.log(`Running: ${preview}...`);
    await db.execute(stmt);
  }

  await db.execute("PRAGMA foreign_keys = ON");

  console.log(`Migration complete. ${statements.length} statements executed.`);
}

migrate().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
