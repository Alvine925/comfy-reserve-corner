// Run with: bun run scripts/update-descriptions.ts
import { createClient } from "@supabase/supabase-js";

// Load from .env manually since this is a standalone script
import { readFileSync } from "fs";
const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => l.split("=").map((s) => s.replace(/^"|"$/g, "").trim()))
);

const SUPABASE_URL = env["SUPABASE_URL"];
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? env["SUPABASE_PUBLISHABLE_KEY"];

const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
});

// Descriptions keyed by the exact product name (name field in DB)
const DESCRIPTIONS: Record<string, { short: string; long: string }> = {
  "Office Chair MB mesh blk (FOS) #11/21": {
    short: "Mid-back black mesh office chair · used, great condition",
    long: "A reliable mid-back mesh office chair finished in black. Pre-owned and in great condition — carefully inspected and well maintained throughout its service life. Features a breathable mesh backrest, cushioned seat, and adjustable height mechanism. A solid everyday work chair ready for immediate use.",
  },
  "Office Chair VIS Mesh Black (FOS) #2/7": {
    short: "Visitor mesh office chair, black · used, great condition",
    long: "A well-built visitor mesh office chair in black. Pre-owned and in great condition — carefully inspected and well maintained throughout its service life. Features a breathable mesh back and padded seat, making it comfortable for meetings, reception areas, or additional seating in any office.",
  },
  "High Back Chair Mesh(XY)": {
    short: "High-back mesh office chair · used, great condition",
    long: "An ergonomic high-back mesh office chair offering excellent lumbar and upper-back support. Pre-owned and in great condition — carefully inspected and well maintained throughout its service life. The tall backrest and adjustable height make it ideal for long working hours or executive settings.",
  },
  "Brown Office Table 1.4Mts #1/3": {
    short: "1.4m brown office workstation desk · used, great condition",
    long: "A sturdy 1.4-metre office workstation desk in a warm brown finish. Pre-owned and in great condition — carefully inspected and well maintained throughout its service life. Comes with a side pedestal for convenient storage — a compact yet fully functional workspace for individual offices or open-plan layouts.",
  },
  "Coffee Colour Office Directors table": {
    short: "1.6m executive director's desk, coffee finish · used, great condition",
    long: "A commanding 1.6-metre executive director's desk in a rich coffee finish. Pre-owned and in great condition — carefully inspected and well maintained throughout its service life. The generous work surface and refined styling make it a fitting centrepiece for a director's or senior manager's office.",
  },
  "Conference table 4.2MTS (HILM)": {
    short: "4.2m boardroom conference table · used, great condition",
    long: "A large 4.2-metre boardroom conference table built for serious meetings and presentations. Pre-owned and in great condition — carefully inspected and well maintained throughout its service life. Comfortably seats up to 14 people and makes an impressive statement in any boardroom or executive meeting room.",
  },
  "Coffee Colour Office Boardroom ConferenceTable": {
    short: "Coffee-finish boardroom conference table · used, great condition",
    long: "An elegant boardroom conference table in a warm coffee finish. Pre-owned and in great condition — carefully inspected and well maintained throughout its service life. Designed for professional meeting environments, it combines a spacious surface with a polished look that elevates any conference room.",
  },
  "P-RA3208 Reception Table 3.2 MTS (SENC)": {
    short: "3.2m reception desk · used, great condition",
    long: "A substantial 3.2-metre reception desk designed to make a strong first impression. Pre-owned and in great condition — carefully inspected and well maintained throughout its service life. Its generous counter space and professional finish make it ideal for reception areas, front offices, or any customer-facing space.",
  },
};

async function main() {
  let totalUpdated = 0;

  for (const [name, desc] of Object.entries(DESCRIPTIONS)) {
    const { data, error, count } = await client
      .from("products")
      .update({ short_description: desc.short, description: desc.long })
      .eq("name", name)
      .select("id");

    if (error) {
      console.error(`❌ Failed for "${name}":`, error.message);
    } else {
      const n = data?.length ?? 0;
      totalUpdated += n;
      console.log(`✅ Updated ${n} row(s) — ${name}`);
    }
  }

  console.log(`\nDone. Total rows updated: ${totalUpdated}`);
}

main();
