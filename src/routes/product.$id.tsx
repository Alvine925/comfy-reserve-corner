import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ShoppingBag, ChevronDown, CheckCircle2 } from "lucide-react";
import {
  getProduct,
  getProductGroupInfo,
  getAvailableUnitsForProduct,
  createCounterOffer,
} from "@/lib/products.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/lib/cart-context";
import { cleanName } from "@/lib/name-utils";

// ─── Gallery ────────────────────────────────────────────────
function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  if (images.length === 0) {
    return (
      <div className="aspect-square overflow-hidden bg-muted/30 flex items-center justify-center text-muted-foreground">
        No image
      </div>
    );
  }
  return (
    <div>
      <div className="aspect-square overflow-hidden rounded-xl bg-muted/30">
        <img src={images[active]} alt={name} className="h-full w-full object-cover" />
      </div>
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setActive(i)}
              className={`aspect-square overflow-hidden rounded-lg bg-muted/30 ${i === active ? "ring-2 ring-primary" : ""}`}
            >
              <img src={src} alt={`${name} ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Queries ────────────────────────────────────────────────
const productQuery = (id: string) =>
  queryOptions({
    queryKey: ["product", id],
    queryFn: () => getProduct({ data: { id } }),
  });

const groupQuery = (id: string) =>
  queryOptions({
    queryKey: ["product-group", id],
    queryFn: () => getProductGroupInfo({ data: { id } }),
    staleTime: 10_000,
  });

const availableUnitsQuery = (id: string) =>
  queryOptions({
    queryKey: ["available-units", id],
    queryFn: () => getAvailableUnitsForProduct({ data: { id } }),
    staleTime: 10_000,
  });

// ─── Route ──────────────────────────────────────────────────
export const Route = createFileRoute("/product/$id")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(productQuery(params.id));
    if (!data) throw notFound();
    context.queryClient.prefetchQuery(groupQuery(params.id));
    context.queryClient.prefetchQuery(availableUnitsQuery(params.id));
    return data;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${cleanName(loaderData.name)} — Reserve now` },
          { name: "description", content: loaderData.short_description || `Reserve ${cleanName(loaderData.name)} online.` },
          { property: "og:title", content: cleanName(loaderData.name) },
          { property: "og:description", content: loaderData.short_description || `Reserve ${cleanName(loaderData.name)} online.` },
          ...(loaderData.image_url ? [{ property: "og:image", content: loaderData.image_url }] : []),
        ]
      : [{ title: "Product" }],
  }),
  component: ProductPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-destructive">Failed to load: {error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="p-8 text-center">
      <p>Product not found.</p>
      <Link to="/" className="text-primary underline">Back to browse</Link>
    </div>
  ),
});

// ─── Page ───────────────────────────────────────────────────
function ProductPage() {
  const { id } = Route.useParams();
  const { data: product } = useSuspenseQuery(productQuery(id));
  const { data: groupInfo } = useQuery(groupQuery(id));
  const { data: availableUnits } = useQuery(availableUnitsQuery(id));
  const router = useRouter();

  if (!product) return null;

  const images = (
    product.image_urls?.length ? product.image_urls : product.image_url ? [product.image_url] : []
  ) as string[];

  const displayName = cleanName(product.name);

  return (
    <div className="min-h-screen bg-background">
      <header>
        <div className="mx-auto max-w-5xl px-4 py-4">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to browse
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-10 px-4 py-8 md:grid-cols-2">
        <ProductGallery images={images} name={displayName} />

        <div>
          {product.is_reserved && (
            <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 font-medium">
              🔒 This item is currently reserved
            </div>
          )}

          <h1 className="text-3xl font-bold text-foreground">{displayName}</h1>

          {product.short_description && (
            <p className="mt-3 text-base text-accent-foreground/80">{product.short_description}</p>
          )}
          <p className="mt-4 text-4xl font-bold text-primary">
            KSh {Number(product.offer_price).toLocaleString()}
          </p>

          {/* Unit availability */}
          {groupInfo && groupInfo.total > 1 && (
            <p className="mt-2 text-sm text-muted-foreground">
              {groupInfo.available} of {groupInfo.total} unit{groupInfo.total !== 1 ? "s" : ""} available
            </p>
          )}

          {product.description && (
            <p className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          )}

          <div className="mt-10">
            {product.is_reserved ? (
              <CounterOfferForm product={product} onSuccess={() => router.invalidate()} />
            ) : (
              <SerialPickerPanel
                product={product}
                availableUnits={availableUnits}
                onReserved={() => router.invalidate()}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Serial picker + Add to Cart ────────────────────────────
function SerialPickerPanel({
  product,
  availableUnits,
  onReserved,
}: {
  product: {
    id: string;
    name: string;
    offer_price: number;
    serial_number?: string | null;
    image_url?: string | null;
    category?: string | null;
  };
  availableUnits?: {
    units: { id: string; serial_number: string | null }[];
    name: string;
    price: number;
    imageUrl: string | null;
    category: string | null;
  } | null;
  onReserved: () => void;
}) {
  const { addItem, openCart, items } = useCart();
  const units = availableUnits?.units ?? [];

  // Pre-select the current product's unit if present, else the first available
  const defaultUnit =
    units.find((u) => u.id === product.id) ?? units[0] ?? null;

  const [selectedUnitId, setSelectedUnitId] = useState<string>(
    defaultUnit?.id ?? "",
  );

  const selectedUnit = units.find((u) => u.id === selectedUnitId) ?? null;
  const alreadyInCart = items.some((i) => i.unitId === selectedUnitId);

  function handleAddToCart() {
    if (!selectedUnit) return;
    addItem({
      unitId: selectedUnit.id,
      serialNumber: selectedUnit.serial_number ?? selectedUnit.id,
      productName: product.name,
      category: (product as any).category ?? availableUnits?.category ?? null,
      price: Number(product.offer_price),
      imageUrl: product.image_url ?? availableUnits?.imageUrl ?? null,
    });
    toast.success(
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <span>
          Added <strong>{cleanName(product.name)}</strong> (S/N:{" "}
          {selectedUnit.serial_number}) to cart
        </span>
      </div>,
      {
        action: {
          label: "View cart",
          onClick: openCart,
        },
      },
    );
  }

  if (units.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        No units currently available to reserve.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Reserve this item</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a specific unit, then add it to your cart. You can reserve items from multiple categories in one go.
        </p>
      </div>

      {/* Serial number selector */}
      <div className="space-y-1.5">
        <Label htmlFor="serial-select">
          Select unit — serial number
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
            ({units.length} available)
          </span>
        </Label>
        {units.length === 1 ? (
          /* Only one unit — show it as a badge, no picker needed */
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-2.5">
            <span className="font-mono text-sm font-semibold tracking-wide text-foreground">
              {units[0].serial_number ?? "—"}
            </span>
            <span className="text-xs text-muted-foreground">(only unit available)</span>
          </div>
        ) : (
          <div className="relative">
            <select
              id="serial-select"
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              className="w-full appearance-none rounded-lg border border-input bg-background px-4 py-2.5 pr-10 font-mono text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.serial_number ?? u.id}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Add to cart button */}
      <Button
        type="button"
        onClick={handleAddToCart}
        disabled={!selectedUnit || alreadyInCart}
        className="w-full gap-2"
      >
        <ShoppingBag className="h-4 w-4" />
        {alreadyInCart ? "Already in cart" : "Add to cart"}
      </Button>

      {alreadyInCart && (
        <button
          type="button"
          onClick={openCart}
          className="w-full text-center text-sm text-primary underline-offset-4 hover:underline"
        >
          View cart & checkout →
        </button>
      )}
    </div>
  );
}

// ─── Counter offer form ──────────────────────────────────────
function CounterOfferForm({
  product,
  onSuccess,
}: {
  product: { id: string; name: string; offer_price: number; serial_number?: string | null };
  onSuccess: () => void;
}) {
  const submitOffer = useServerFn(createCounterOffer);
  const [form, setForm] = useState({ name: "", email: "", phone: "", counter_price: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const minPrice = Number(product.offer_price) + 1;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(form.counter_price);
    if (price <= Number(product.offer_price)) {
      toast.error(`Your offer must be higher than KSh ${Number(product.offer_price).toLocaleString()}`);
      return;
    }
    setSubmitting(true);
    try {
      await submitOffer({
        data: {
          product_id: product.id,
          customer_name: form.name,
          customer_email: form.email,
          customer_phone: form.phone,
          counter_price: price,
          notes: form.notes || undefined,
        },
      });
      setSubmitted(true);
      toast.success("Counter offer submitted! The current reserver has been notified.");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit offer");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
        <p className="font-semibold text-green-800">Counter offer submitted!</p>
        <p className="mt-1 text-sm text-green-700">
          The current reserver has been notified by email. We'll be in touch if your offer is accepted.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">This item is reserved</p>
        {product.serial_number && (
          <p className="mt-1 font-mono text-xs">Unit: <strong>{product.serial_number}</strong></p>
        )}
        <p className="mt-1">
          Submit a counter offer above{" "}
          <strong>KSh {Number(product.offer_price).toLocaleString()}</strong>. The current reserver
          will be emailed their unit serial number and given a chance to increase their offer.
        </p>
      </div>
      <h2 className="text-xl font-semibold text-foreground">Make a counter offer</h2>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <div>
          <Label htmlFor="co-price">Your offer (min KSh {minPrice.toLocaleString()})</Label>
          <Input
            id="co-price"
            type="number"
            min={minPrice}
            step="1"
            required
            value={form.counter_price}
            onChange={(e) => setForm({ ...form, counter_price: e.target.value })}
            placeholder={`e.g. ${(Number(product.offer_price) + 500).toLocaleString()}`}
          />
        </div>
        <div>
          <Label htmlFor="co-name">Full name</Label>
          <Input id="co-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} />
        </div>
        <div>
          <Label htmlFor="co-email">Email</Label>
          <Input id="co-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} />
        </div>
        <div>
          <Label htmlFor="co-phone">Phone</Label>
          <Input id="co-phone" type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={40} />
        </div>
        <div>
          <Label htmlFor="co-notes">Notes (optional)</Label>
          <Textarea id="co-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={1000} rows={3} />
        </div>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Submitting…" : "Submit counter offer"}
        </Button>
      </form>
    </>
  );
}
