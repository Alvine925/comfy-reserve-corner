import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ─────────────────────────────────────────────
// Serial number helpers
// ─────────────────────────────────────────────
function serialPrefix(name: string): string {
  // Take first 6 alphanumeric chars of the name, uppercase
  const clean = name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase();
  return clean || "PROD";
}

async function nextSerialStart(
  supabase: any,
  prefix: string,
): Promise<number> {
  const { data } = await supabase
    .from("products")
    .select("serial_number")
    .ilike("serial_number", `${prefix}-%`);
  let max = 0;
  for (const p of data ?? []) {
    if (!p.serial_number) continue;
    const parts = p.serial_number.split("-");
    const n = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(n) && n > max) max = n;
  }
  return max + 1;
}

function padSerial(prefix: string, n: number) {
  return `${prefix}-${String(n).padStart(3, "0")}`;
}

// ─────────────────────────────────────────────
// Public: list active products for browse page.
// ─────────────────────────────────────────────
export const listActiveProducts = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await client
    .from("products")
    .select("id,name,short_description,description,offer_price,acquisition_price,image_url,image_urls,is_reserved,serial_number,category,views,likes")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

// ─────────────────────────────────────────────
// Public: increment product view count.
// ─────────────────────────────────────────────
export const incrementProductViews = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p } = await supabaseAdmin.from("products").select("views").eq("id", data.id).single();
    const newViews = (p?.views ?? 0) + 1;
    await supabaseAdmin.from("products").update({ views: newViews }).eq("id", data.id);
    return { views: newViews };
  });

// ─────────────────────────────────────────────
// Public: toggle product like (like / unlike).
// ─────────────────────────────────────────────
export const toggleProductLike = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), action: z.enum(["like", "unlike"]) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p } = await supabaseAdmin.from("products").select("likes").eq("id", data.id).single();
    const newLikes = Math.max(0, (p?.likes ?? 0) + (data.action === "like" ? 1 : -1));
    await supabaseAdmin.from("products").update({ likes: newLikes }).eq("id", data.id);
    return { likes: newLikes };
  });

// ─────────────────────────────────────────────
// Public: single product.
// ─────────────────────────────────────────────
export const getProduct = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data: row, error } = await client
      .from("products")
      .select("*")
      .eq("id", data.id)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

// ─────────────────────────────────────────────
// Public: available / total units for a product name group.
// ─────────────────────────────────────────────
export const getProductGroupInfo = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data: product, error: pErr } = await client
      .from("products")
      .select("name")
      .eq("id", data.id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!product) return { available: 0, total: 0, name: "" };

    const { data: units, error: uErr } = await client
      .from("products")
      .select("id,is_reserved")
      .eq("name", product.name)
      .eq("is_active", true);
    if (uErr) throw new Error(uErr.message);

    const total = units?.length ?? 0;
    const available = units?.filter((u) => !u.is_reserved).length ?? 0;
    return { available, total, name: product.name };
  });

// ─────────────────────────────────────────────
// Admin helpers
// ─────────────────────────────────────────────
export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error) throw new Error(error.message);
    return { isAdmin: !!data };
  });

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

// ─────────────────────────────────────────────
// Admin: list all products.
// ─────────────────────────────────────────────
export const adminListProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ─────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────
const productBaseSchema = z.object({
  name: z.string().min(1).max(200),
  short_description: z.string().max(300).nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  acquisition_price: z.number().nonnegative().nullable().optional(),
  offer_price: z.number().nonnegative(),
  image_url: z.string().url().max(2000).nullable().optional(),
  image_urls: z.array(z.string().url().max(2000)).max(20).optional(),
  is_active: z.boolean().optional(),
  is_reserved: z.boolean().optional(),
  category: z.string().max(60).nullable().optional(),
});

// Create extends base with a quantity field (not stored; drives batch creation)
const createProductSchema = productBaseSchema.extend({
  quantity: z.number().int().min(1).max(500).default(1),
});

// Update and bulk import use the base schema
const productSchema = productBaseSchema;

// ─────────────────────────────────────────────
// Admin: create product(s).
// quantity > 1 generates N copies each with a unique serial number.
// ─────────────────────────────────────────────
export const createProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createProductSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { quantity, ...fields } = data;
    const prefix = serialPrefix(fields.name);
    const start = await nextSerialStart(context.supabase, prefix);

    const rows = Array.from({ length: quantity }, (_, i) => ({
      ...fields,
      serial_number: padSerial(prefix, start + i),
    }));

    const { data: inserted, error } = await context.supabase
      .from("products")
      .insert(rows)
      .select("id,serial_number");
    if (error) throw new Error(error.message);

    const serials = (inserted ?? []).map((r: any) => r.serial_number as string);
    return {
      count: serials.length,
      firstSerial: serials[0] ?? null,
      lastSerial: serials[serials.length - 1] ?? null,
    };
  });

export const updateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), patch: productSchema.partial() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    // Get the current product's name so we can find siblings before any name change
    const { data: current, error: cErr } = await context.supabase
      .from("products")
      .select("name")
      .eq("id", data.id)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    const oldName = current?.name;

    // Update the target product
    const { data: row, error } = await context.supabase
      .from("products")
      .update(data.patch)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Propagate all edits to every other unit with the same (old) name.
    // Each unit keeps its own serial_number and id; everything else syncs.
    if (oldName) {
      const { error: syncErr } = await context.supabase
        .from("products")
        .update(data.patch)
        .eq("name", oldName)
        .neq("id", data.id);
      if (syncErr) throw new Error(syncErr.message);
    }

    return row;
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─────────────────────────────────────────────
// Admin: sync image_urls across all products with the same name.
// ─────────────────────────────────────────────
export const syncGroupImages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ product_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: product, error: pErr } = await context.supabase
      .from("products")
      .select("name,image_url,image_urls")
      .eq("id", data.product_id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!product) throw new Error("Product not found");

    const { data: updated, error: uErr } = await context.supabase
      .from("products")
      .update({ image_urls: product.image_urls, image_url: product.image_url })
      .eq("name", product.name)
      .neq("id", data.product_id)
      .select("id");
    if (uErr) throw new Error(uErr.message);
    return { synced: updated?.length ?? 0, name: product.name };
  });

// ─────────────────────────────────────────────
// Admin: bulk import
// ─────────────────────────────────────────────
export const bulkImportProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ rows: z.array(productSchema).min(1).max(1000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    // Assign serial numbers to imported rows
    const prefixMap: Record<string, number> = {};
    const rowsWithSerials = await Promise.all(
      data.rows.map(async (row) => {
        const prefix = serialPrefix(row.name);
        if (prefixMap[prefix] === undefined) {
          prefixMap[prefix] = await nextSerialStart(context.supabase, prefix);
        }
        const serial = padSerial(prefix, prefixMap[prefix]!);
        prefixMap[prefix]!++;
        return { ...row, serial_number: serial };
      }),
    );

    const { data: rows, error } = await context.supabase
      .from("products")
      .insert(rowsWithSerials)
      .select("id");
    if (error) throw new Error(error.message);
    return { inserted: rows?.length ?? 0 };
  });

// ─────────────────────────────────────────────
// Public: create a reservation (supports quantity).
// Finds N available units with the same product name and marks all reserved.
// ─────────────────────────────────────────────
const reservationSchema = z.object({
  product_id: z.string().uuid(),
  customer_name: z.string().trim().min(1).max(120),
  customer_email: z.string().trim().email().max(255),
  customer_phone: z.string().trim().min(3).max(40),
  notes: z.string().max(1000).optional(),
  quantity: z.number().int().min(1).max(500).default(1),
});

export const createReservation = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => reservationSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendBrevoEmail, reservationConfirmationHtml, adminNotificationHtml } = await import(
      "./email.server"
    );

    const qty = data.quantity ?? 1;

    const { data: product, error: pErr } = await supabaseAdmin
      .from("products")
      .select("id,name,offer_price,is_reserved,is_active")
      .eq("id", data.product_id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!product || !product.is_active) throw new Error("Product not available");

    // Find N available units with same name
    const { data: availableUnits, error: auErr } = await supabaseAdmin
      .from("products")
      .select("id,serial_number:serial_number")
      .eq("name", product.name)
      .eq("is_active", true)
      .eq("is_reserved", false)
      .limit(qty);
    if (auErr) throw new Error(auErr.message);
    if (!availableUnits || availableUnits.length < qty) {
      throw new Error(
        `Only ${availableUnits?.length ?? 0} unit(s) available — please reduce your quantity.`,
      );
    }

    const unitIds = availableUnits.map((u: any) => u.id as string);
    const serialNumbers = availableUnits
      .map((u: any) => (u.serial_number ?? null) as string | null)
      .filter(Boolean) as string[];

    const reservationProductId = unitIds.includes(data.product_id) ? data.product_id : unitIds[0];

    const { data: reservation, error: rErr } = await supabaseAdmin
      .from("reservations")
      .insert({
        product_id: reservationProductId,
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone,
        notes: data.notes ?? null,
        status: "pending",
        quantity: qty,
      })
      .select()
      .single();
    if (rErr) throw new Error(rErr.message);

    await supabaseAdmin.from("products").update({ is_reserved: true }).in("id", unitIds);

    await sendBrevoEmail({
      to: { email: data.customer_email, name: data.customer_name },
      subject: `Reservation confirmed: ${product.name}${qty > 1 ? ` × ${qty}` : ""}`,
      htmlContent: reservationConfirmationHtml({
        customerName: data.customer_name,
        productName: product.name,
        offerPrice: Number(product.offer_price),
        quantity: qty,
        serialNumbers,
      }),
    });

    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
    if (adminEmail) {
      await sendBrevoEmail({
        to: { email: adminEmail },
        subject: `New reservation: ${product.name}${qty > 1 ? ` × ${qty}` : ""}`,
        htmlContent: adminNotificationHtml({
          productName: product.name,
          customerName: data.customer_name,
          customerEmail: data.customer_email,
          customerPhone: data.customer_phone,
          notes: data.notes,
          quantity: qty,
          serialNumbers,
        }),
      });
    }

    return { ok: true, id: reservation.id, serialNumbers };
  });

// ─────────────────────────────────────────────
// Public: counter offer on a reserved product.
// ─────────────────────────────────────────────
const counterOfferSchema = z.object({
  product_id: z.string().uuid(),
  customer_name: z.string().trim().min(1).max(120),
  customer_email: z.string().trim().email().max(255),
  customer_phone: z.string().trim().min(3).max(40),
  counter_price: z.number().positive(),
  notes: z.string().max(1000).optional(),
});

export const createCounterOffer = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => counterOfferSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendBrevoEmail, outbidNotificationHtml } = await import("./email.server");

    const { data: product, error: pErr } = await supabaseAdmin
      .from("products")
      .select("id,name,offer_price,is_reserved,is_active")
      .eq("id", data.product_id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!product || !product.is_active) throw new Error("Product not found");
    if (!product.is_reserved)
      throw new Error("This item is no longer reserved — you can reserve it directly");
    if (data.counter_price <= Number(product.offer_price)) {
      throw new Error(
        `Counter price must be higher than the current offer of KSh ${Number(product.offer_price).toLocaleString()}`,
      );
    }

    const { data: co, error: coErr } = await supabaseAdmin
      .from("counter_offers")
      .insert({
        product_id: data.product_id,
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone,
        counter_price: data.counter_price,
        notes: data.notes ?? null,
        status: "pending",
      })
      .select()
      .single();
    if (coErr) throw new Error(coErr.message);

    const { data: reservation } = await supabaseAdmin
      .from("reservations")
      .select("customer_name,customer_email")
      .eq("product_id", data.product_id)
      .in("status", ["pending", "confirmed"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (reservation) {
      await sendBrevoEmail({
        to: { email: reservation.customer_email, name: reservation.customer_name },
        subject: `Your reservation for ${product.name} has been outbid`,
        htmlContent: outbidNotificationHtml({
          reserverName: reservation.customer_name,
          productName: product.name,
          serialNumber: product.serial_number ?? undefined,
          originalPrice: Number(product.offer_price),
          counterPrice: data.counter_price,
        }),
      });
    }

    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
    if (adminEmail) {
      await sendBrevoEmail({
        to: { email: adminEmail },
        subject: `Counter offer on: ${product.name}${product.serial_number ? ` (${product.serial_number})` : ""}`,
        htmlContent: `
          <p><strong>Counter offer received</strong></p>
          <p>Product: ${product.name}${product.serial_number ? ` — Serial: <code>${product.serial_number}</code>` : ""}</p>
          <p>Counter price: KSh ${data.counter_price.toLocaleString()}</p>
          <p>From: ${data.customer_name} — ${data.customer_email} — ${data.customer_phone}</p>
          ${data.notes ? `<p>Notes: ${data.notes}</p>` : ""}
        `,
      });
    }

    return { ok: true, id: co.id };
  });

// ─────────────────────────────────────────────
// Admin: reservations & counter offers
// ─────────────────────────────────────────────
export const adminListReservations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("reservations")
      .select("*, products(name, offer_price)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateReservationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pending", "confirmed", "cancelled", "completed"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("reservations")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListCounterOffers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("counter_offers")
      .select("*, products(name, offer_price)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateCounterOfferStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pending", "accepted", "outbid", "withdrawn"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("counter_offers")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─────────────────────────────────────────────
// Public: all available units for a product name group.
// Used by the serial-number picker on the product page.
// ─────────────────────────────────────────────
export const getAvailableUnitsForProduct = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );

    const { data: product, error: pErr } = await client
      .from("products")
      .select("name,offer_price,image_url,category")
      .eq("id", data.id)
      .eq("is_active", true)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!product) return { units: [], name: "", price: 0, imageUrl: null, category: null };

    const { data: units, error: uErr } = await client
      .from("products")
      .select("id,serial_number")
      .eq("name", product.name)
      .eq("is_active", true)
      .eq("is_reserved", false)
      .order("serial_number", { ascending: true });
    if (uErr) throw new Error(uErr.message);

    return {
      units: (units ?? []).map((u: any) => ({
        id: u.id as string,
        serial_number: (u.serial_number ?? null) as string | null,
      })),
      name: product.name as string,
      price: Number(product.offer_price),
      imageUrl: (product.image_url ?? null) as string | null,
      category: (product.category ?? null) as string | null,
    };
  });

// ─────────────────────────────────────────────
// Public: reserve a cart of specific units in one go.
// Each item specifies the exact unit (by id) the customer chose.
// ─────────────────────────────────────────────
const cartReservationSchema = z.object({
  items: z.array(z.object({ unit_id: z.string().uuid() })).min(1).max(50),
  customer_name: z.string().trim().min(1).max(120),
  customer_email: z.string().trim().email().max(255),
  customer_phone: z.string().trim().min(3).max(40),
  notes: z.string().max(1000).optional(),
});

export const createCartReservation = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => cartReservationSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendBrevoEmail, reservationConfirmationHtml, adminNotificationHtml } = await import(
      "./email.server"
    );

    const unitIds = data.items.map((i) => i.unit_id);

    // Fetch all units and validate availability
    const { data: units, error: uErr } = await supabaseAdmin
      .from("products")
      .select("id,name,offer_price,serial_number,is_active,is_reserved")
      .in("id", unitIds);
    if (uErr) throw new Error(uErr.message);

    for (const uid of unitIds) {
      const unit = (units ?? []).find((u: any) => u.id === uid);
      if (!unit || !unit.is_active) throw new Error(`A selected item is no longer available`);
      if (unit.is_reserved)
        throw new Error(
          `Unit ${unit.serial_number ?? uid} was just reserved by someone else — please remove it from your cart`,
        );
    }

    // Insert one reservation record per unit
    const reservationRows = unitIds.map((uid) => ({
      product_id: uid,
      customer_name: data.customer_name,
      customer_email: data.customer_email,
      customer_phone: data.customer_phone,
      notes: data.notes ?? null,
      status: "pending",
      quantity: 1,
    }));

    const { error: rErr } = await supabaseAdmin.from("reservations").insert(reservationRows);
    if (rErr) throw new Error(rErr.message);

    // Mark all units reserved
    await supabaseAdmin.from("products").update({ is_reserved: true }).in("id", unitIds);

    const serialNumbers = (units ?? [])
      .map((u: any) => u.serial_number as string | null)
      .filter(Boolean) as string[];

    const productNames = [...new Set((units ?? []).map((u: any) => u.name as string))];
    const totalPrice = (units ?? []).reduce((sum: number, u: any) => sum + Number(u.offer_price), 0);

    await sendBrevoEmail({
      to: { email: data.customer_email, name: data.customer_name },
      subject: `Reservation confirmed: ${productNames.length === 1 ? productNames[0] : `${unitIds.length} items`}`,
      htmlContent: reservationConfirmationHtml({
        customerName: data.customer_name,
        productName: productNames.join(", "),
        offerPrice: totalPrice,
        quantity: unitIds.length,
        serialNumbers,
      }),
    });

    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
    if (adminEmail) {
      await sendBrevoEmail({
        to: { email: adminEmail },
        subject: `New cart reservation: ${unitIds.length} item(s) from ${data.customer_name}`,
        htmlContent: adminNotificationHtml({
          productName: productNames.join(", "),
          customerName: data.customer_name,
          customerEmail: data.customer_email,
          customerPhone: data.customer_phone,
          notes: data.notes,
          quantity: unitIds.length,
          serialNumbers,
        }),
      });
    }

    return { ok: true, serialNumbers };
  });
