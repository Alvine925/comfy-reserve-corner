import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { ShoppingBag, ChevronDown, CheckCircle2, Eye, Heart } from "lucide-react";
import {
  getProduct,
  getProductGroupInfo,
  getAvailableUnitsForProduct,
  createCounterOffer,
  incrementProductViews,
  toggleProductLike,
  getRelatedProducts,
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
const LIKED_KEY = "liked_products";

function getLikedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LIKED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function setLikedIds(ids: Set<string>) {
  try {
    localStorage.setItem(LIKED_KEY, JSON.stringify([...ids]));
  } catch {}
}

function ProductPage() {
  const { id } = Route.useParams();
  const { data: product } = useSuspenseQuery(productQuery(id));
  const { data: groupInfo } = useQuery(groupQuery(id));
  const { data: availableUnits } = useQuery(availableUnitsQuery(id));
  const { data: related } = useQuery({
    queryKey: ["related", id],
    queryFn: () => getRelatedProducts({ data: { category: (product as any).category ?? "", excludeName: product?.name ?? "" } }),
    enabled: !!(product as any).category,
  });
  const router = useRouter();

  const incrementViews = useServerFn(incrementProductViews);
  const doToggleLike = useServerFn(toggleProductLike);

  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState<number | null>(null);
  const [viewsCount, setViewsCount] = useState<number | null>(null);
  const [viewsToday, setViewsToday] = useState<number | null>(null);
  const [likeLoading, setLikeLoading] = useState(false);

  // Increment views once on mount
  useEffect(() => {
    incrementViews({ data: { id } })
      .then((res) => { setViewsCount(res.views); setViewsToday(res.views_today); })
      .catch(() => {});
  }, [id]);

  // Sync liked state from localStorage
  useEffect(() => {
    setIsLiked(getLikedIds().has(id));
    const raw = (product as any).likes;
    if (raw != null) setLikesCount(Number(raw));
  }, [id, product]);

  const handleLike = useCallback(async () => {
    if (likeLoading) return;
    setLikeLoading(true);
    const action = isLiked ? "unlike" : "like";
    // Optimistic update
    setIsLiked(!isLiked);
    setLikesCount((c) => Math.max(0, (c ?? 0) + (action === "like" ? 1 : -1)));
    const ids = getLikedIds();
    action === "like" ? ids.add(id) : ids.delete(id);
    setLikedIds(ids);
    try {
      const res = await doToggleLike({ data: { id, action } });
      setLikesCount(res.likes);
    } catch {
      // revert optimistic update on error
      setIsLiked(isLiked);
      setLikesCount((c) => Math.max(0, (c ?? 0) + (action === "like" ? -1 : 1)));
      const ids2 = getLikedIds();
      action === "like" ? ids2.delete(id) : ids2.add(id);
      setLikedIds(ids2);
      toast.error("Couldn't save your like. Try again.");
    } finally {
      setLikeLoading(false);
    }
  }, [id, isLiked, likeLoading, doToggleLike]);

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

      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-5 md:gap-10 md:py-8 md:grid-cols-2">
        <ProductGallery images={images} name={displayName} />

        <div>
          {product.is_reserved && (
            <div className="mb-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-800 font-medium sm:px-4 sm:py-3 sm:text-sm">
              🔒 This item is currently reserved
            </div>
          )}

          {/* Title */}
          <h1 className="text-xl font-bold tracking-tight text-violet-900 sm:text-3xl">{displayName}</h1>

          {/* Short description */}
          {product.short_description && (
            <p className="mt-2 text-sm text-teal-600 sm:mt-3 sm:text-base">{product.short_description}</p>
          )}

          {/* Pricing block */}
          <div className="mt-3 sm:mt-4">
            <p className="text-2xl font-bold text-emerald-600 sm:text-4xl">
              KSh {Number(product.offer_price).toLocaleString()}
            </p>
            {(product as any).acquisition_price != null && (() => {
              const dep = Math.round((1 - Number(product.offer_price) / Number((product as any).acquisition_price)) * 100);
              return (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-md bg-amber-50 px-3 py-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-500">Acq. price</span>
                    <span className="text-sm font-bold text-amber-800">
                      KSh {Number((product as any).acquisition_price).toLocaleString()}
                    </span>
                  </div>
                  <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-600">
                    -{dep}% depreciated
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Views & Likes */}
          <div className="mt-3 flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <Eye className="h-3.5 w-3.5" />
              {viewsCount != null ? viewsCount.toLocaleString() : (product as any).views ?? 0} view{((viewsCount ?? (product as any).views ?? 0)) !== 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={handleLike}
              disabled={likeLoading}
              className={`flex items-center gap-1.5 text-xs transition-colors ${isLiked ? "text-rose-500" : "text-slate-400 hover:text-rose-400"}`}
            >
              <Heart className={`h-3.5 w-3.5 transition-all ${isLiked ? "fill-rose-500 scale-110" : ""}`} />
              {(likesCount ?? (product as any).likes ?? 0).toLocaleString()} {isLiked ? "liked" : "like"}
            </button>
          </div>

          {/* Viewed today signal */}
          {viewsToday != null && viewsToday > 1 && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-orange-500 font-medium">
              🔥 {viewsToday} {viewsToday === 1 ? "person" : "people"} viewed this today
            </p>
          )}

          {/* Only X left urgency */}
          {groupInfo && groupInfo.available > 0 && groupInfo.available <= 3 && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-600 border border-orange-200">
              ⚡ {groupInfo.available === 1 ? "Last unit available!" : `Only ${groupInfo.available} left!`}
            </p>
          )}

          {groupInfo && groupInfo.total > 1 && (
            <p className="mt-1.5 text-xs text-sky-500 sm:mt-2 sm:text-sm">
              {groupInfo.available} of {groupInfo.total} unit{groupInfo.total !== 1 ? "s" : ""} available
            </p>
          )}

          {/* Long description */}
          {product.description && (
            <p className="mt-4 whitespace-pre-wrap text-xs leading-relaxed text-indigo-600 sm:mt-6 sm:text-sm">
              {product.description}
            </p>
          )}

          <div className="mt-7 sm:mt-10">
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

      {/* Related products */}
      {related && related.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 pb-14">
          <h2 className="mb-4 text-sm font-semibold text-foreground sm:text-base">
            Other {((product as any).category as string ?? "").replace(/_/g, " ")} you might like
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {related.map((r) => {
              const rImages = (r.image_urls?.length ? r.image_urls : r.image_url ? [r.image_url] : []) as string[];
              return (
                <Link
                  key={r.id}
                  to="/product/$id"
                  params={{ id: r.id }}
                  className="group block rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="aspect-square bg-muted/20 overflow-hidden">
                    {rImages[0] ? (
                      <img
                        src={rImages[0]}
                        alt={cleanName(r.name)}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground/20">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-[11px] font-semibold leading-snug text-violet-800 group-hover:text-violet-600 line-clamp-2 sm:text-xs">
                      {cleanName(r.name)}
                    </p>
                    <p className="mt-1 text-[11px] font-bold text-emerald-600 sm:text-xs">
                      KSh {Number(r.offer_price).toLocaleString()}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
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

  const defaultUnit = units.find((u) => u.id === product.id) ?? units[0] ?? null;
  const [selectedUnitId, setSelectedUnitId] = useState<string>(defaultUnit?.id ?? "");

  const cartUnitIds = new Set(items.map((i) => i.unitId));
  const selectedUnit = units.find((u) => u.id === selectedUnitId) ?? null;
  const selectedInCart = cartUnitIds.has(selectedUnitId);
  const allInCart = units.length > 0 && units.every((u) => cartUnitIds.has(u.id));
  const cartCount = units.filter((u) => cartUnitIds.has(u.id)).length;

  function handleAddToCart() {
    if (!selectedUnit || selectedInCart) return;
    addItem({
      unitId: selectedUnit.id,
      serialNumber: selectedUnit.serial_number ?? selectedUnit.id,
      productName: product.name,
      category: (product as any).category ?? availableUnits?.category ?? null,
      price: Number(product.offer_price),
      imageUrl: product.image_url ?? availableUnits?.imageUrl ?? null,
    });
    toast.success(
      `Added S/N ${selectedUnit.serial_number} to cart`,
      { action: { label: "View cart", onClick: openCart } },
    );
    // Auto-advance to next unit not yet in cart
    const next = units.find((u) => u.id !== selectedUnit.id && !cartUnitIds.has(u.id));
    if (next) setSelectedUnitId(next.id);
  }

  if (units.length === 0) {
    return (
      <p className="py-6 text-sm text-muted-foreground">
        No units currently available to reserve.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Reserve this item</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a serial number, add it to your cart. Mix items from any category — checkout once.
        </p>
      </div>

      {/* Serial selector */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="serial-select">Serial number</Label>
          <span className="text-xs text-muted-foreground">
            {units.length - cartCount} of {units.length} unit{units.length !== 1 ? "s" : ""} available
            {cartCount > 0 && ` · ${cartCount} in cart`}
          </span>
        </div>

        {units.length === 1 ? (
          <div className="flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3">
            <span className="font-mono text-sm font-bold tracking-wide text-indigo-700">
              {units[0].serial_number ?? "—"}
            </span>
            {cartUnitIds.has(units[0].id) && (
              <span className="text-xs font-medium text-indigo-400">In cart</span>
            )}
          </div>
        ) : (
          <>
            {/* Selected serial badge */}
            {selectedUnit && (
              <div className="flex items-center gap-2 rounded-md bg-indigo-50 border border-indigo-200 px-3 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-indigo-400">Selected S/N</span>
                <span className="font-mono text-sm font-bold text-indigo-700">{selectedUnit.serial_number ?? selectedUnit.id}</span>
                {selectedInCart && <span className="ml-auto text-xs font-medium text-indigo-400">In cart</span>}
              </div>
            )}
            <div className="relative">
            <select
              id="serial-select"
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              className="w-full appearance-none rounded-lg border border-input bg-background px-4 py-2.5 pr-10 font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {units.map((u) => {
                const inCart = cartUnitIds.has(u.id);
                return (
                  <option key={u.id} value={u.id}>
                    {u.serial_number ?? u.id}{inCart ? "  ✓ in cart" : ""}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          </>
        )}
      </div>

      {/* Add to cart */}
      {allInCart ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            All {units.length} unit{units.length !== 1 ? "s" : ""} of this item are in your cart.
          </p>
          <Button type="button" variant="outline" className="w-full gap-2" onClick={openCart}>
            <ShoppingBag className="h-4 w-4" />
            View cart & checkout
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <Button
            type="button"
            onClick={handleAddToCart}
            disabled={selectedInCart}
            className="w-full gap-2"
          >
            <ShoppingBag className="h-4 w-4" />
            {selectedInCart ? "This unit is already in cart — pick another" : "Add to cart"}
          </Button>

          {cartCount > 0 && (
            <button
              type="button"
              onClick={openCart}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {cartCount} item{cartCount !== 1 ? "s" : ""} in cart · checkout or keep adding →
            </button>
          )}
        </div>
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
