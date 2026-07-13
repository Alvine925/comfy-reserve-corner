import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Public: list active products for browse page.
export const listActiveProducts = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await client
    .from("products")
    .select("id,name,short_description,description,offer_price,image_url,is_reserved")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

// Public: single product.
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
      .select("id,name,short_description,description,offer_price,image_url,is_reserved,is_active")
      .eq("id", data.id)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

// Check current user is admin.
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

// Admin: list all products.
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

// Reservations
const reservationSchema = z.object({
  product_id: z.string().uuid(),
  customer_name: z.string().trim().min(1).max(120),
  customer_email: z.string().trim().email().max(255),
  customer_phone: z.string().trim().min(3).max(40),
  notes: z.string().max(1000).optional(),
});

// Public: create a reservation and send emails.
export const createReservation = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => reservationSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendBrevoEmail, reservationConfirmationHtml, adminNotificationHtml } = await import(
      "./email.server"
    );

    // Fetch product & check availability
    const { data: product, error: pErr } = await supabaseAdmin
      .from("products")
      .select("id,name,offer_price,is_reserved,is_active")
      .eq("id", data.product_id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!product || !product.is_active) throw new Error("Product not available");
    if (product.is_reserved) throw new Error("This product is already reserved");

    // Insert reservation
    const { data: reservation, error: rErr } = await supabaseAdmin
      .from("reservations")
      .insert({
        product_id: data.product_id,
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone,
        notes: data.notes ?? null,
        status: "pending",
      })
      .select()
      .single();
    if (rErr) throw new Error(rErr.message);

    // Mark product as reserved
    await supabaseAdmin.from("products").update({ is_reserved: true }).eq("id", data.product_id);

    // Send confirmation email to customer
    await sendBrevoEmail({
      to: { email: data.customer_email, name: data.customer_name },
      subject: `Reservation confirmed: ${product.name}`,
      htmlContent: reservationConfirmationHtml({
        customerName: data.customer_name,
        productName: product.name,
        offerPrice: Number(product.offer_price),
      }),
    });

    // Notify admin
    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
    if (adminEmail) {
      await sendBrevoEmail({
        to: { email: adminEmail },
        subject: `New reservation: ${product.name}`,
        htmlContent: adminNotificationHtml({
          productName: product.name,
          customerName: data.customer_name,
          customerEmail: data.customer_email,
          customerPhone: data.customer_phone,
          notes: data.notes,
        }),
      });
    }

    return { ok: true, id: reservation.id };
  });

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
