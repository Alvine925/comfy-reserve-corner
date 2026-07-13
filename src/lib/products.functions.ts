import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
    .select("id,name,short_description,description,offer_price,image_url,image_urls,is_reserved")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
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
      .select("id,name,short_description,description,offer_price,image_url,image_urls,is_reserved,is_active")
      .eq("id", data.id)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

// ─────────────────────────────────────────────
// Public: get available / total units for a product group (same name).
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

    // First: get this product's name
    const { data: product, error: pErr } = await client
      .from("products")
      .select("name")
      .eq("id", data.id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!product) return { available: 0, total: 0, name: "" };

    // Count all active units with the same name
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

const productSchema = z.object({
  name: z.string().min(1).max(200),
  short_description: z.string().max(300).nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  acquisition_price: z.number().nonnegative().nullable().optional(),
  offer_price: z.number().nonnegative(),
  image_url: z.string().url().max(2000).nullable().optional(),
  image_urls: z.array(z.string().url().max(2000)).max(20).optional(),
  is_active: z.boolean().optional(),
  is_reserved: z.boolean().optional(),
});

export const createProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => productSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("products")
      .insert(data)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), patch: productSchema.partial() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("products")
      .update(data.patch)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
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

// Bulk import: array of product rows.
export const bulkImportProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ rows: z.array(productSchema).min(1).max(1000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("products")
      .insert(data.rows)
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

    // Fetch the requested product & check it exists
    const { data: product, error: pErr } = await supabaseAdmin
      .from("products")
      .select("id,name,offer_price,is_reserved,is_active")
      .eq("id", data.product_id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!product || !product.is_active) throw new Error("Product not available");

    // Find N available units with same name (including the requested one)
    const { data: availableUnits, error: auErr } = await supabaseAdmin
      .from("products")
      .select("id")
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

    const unitIds = availableUnits.map((u) => u.id);

    // Insert one reservation (linked to first available unit, preferring the requested product)
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

    // Mark all N units as reserved
    await supabaseAdmin.from("products").update({ is_reserved: true }).in("id", unitIds);

    // Send confirmation email to customer
    await sendBrevoEmail({
      to: { email: data.customer_email, name: data.customer_name },
      subject: `Reservation confirmed: ${product.name}${qty > 1 ? ` × ${qty}` : ""}`,
      htmlContent: reservationConfirmationHtml({
        customerName: data.customer_name,
        productName: product.name,
        offerPrice: Number(product.offer_price),
        quantity: qty,
      }),
    });

    // Notify admin
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
        }),
      });
    }

    return { ok: true, id: reservation.id };
  });

// ─────────────────────────────────────────────
// Public: submit a counter offer on a reserved product.
// Emails the original reserver to inform them they've been outbid.
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

    // Get product
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

    // Insert counter offer
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

    // Find original reserver to notify them
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
          originalPrice: Number(product.offer_price),
          counterPrice: data.counter_price,
        }),
      });
    }

    // Notify admin
    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
    if (adminEmail) {
      await sendBrevoEmail({
        to: { email: adminEmail },
        subject: `Counter offer on: ${product.name}`,
        htmlContent: `
          <p><strong>Counter offer received</strong></p>
          <p>Product: ${product.name}</p>
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
