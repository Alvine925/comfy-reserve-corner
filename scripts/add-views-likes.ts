// Run with: bun run scripts/add-views-likes.ts
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^"|"$/g, "")];
    })
);

const SUPABASE_URL = env["SUPABASE_URL"];
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const SQL = `
ALTER TABLE products ADD COLUMN IF NOT EXISTS views  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS likes  INTEGER NOT NULL DEFAULT 0;
`;

// Try Supabase pg-meta API (service-role key gives access on self-hosted / some plans)
async function tryPgMeta() {
  const url = `${SUPABASE_URL}/pg/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: SQL }),
  });
  return { ok: res.ok, status: res.status, body: await res.text() };
}

const result = await tryPgMeta();
if (result.ok) {
  console.log("✅ Migration applied via pg-meta API");
} else {
  console.log(`⚠️  pg-meta API returned ${result.status}. Run this SQL manually in your Supabase SQL Editor:`);
  console.log("─".repeat(60));
  console.log(SQL);
  console.log("─".repeat(60));
  console.log("Go to: https://supabase.com/dashboard/project/wvmmdfvdvagmrwpgsbuc/sql/new");
}
