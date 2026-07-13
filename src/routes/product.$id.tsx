import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

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
      <div className="aspect-square overflow-hidden bg-muted/30">
        <img src={images[active]} alt={name} className="h-full w-full object-cover" />
      </div>
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setActive(i)}
              className={`aspect-square overflow-hidden bg-muted/30 ${i === active ? "ring-2 ring-primary" : ""}`}
            >
              <img src={src} alt={`${name} ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


import { toast } from "sonner";
import { getProduct, createReservation } from "@/lib/products.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";

const productQuery = (id: string) =>
  queryOptions({
    queryKey: ["product", id],
    queryFn: () => getProduct({ data: { id } }),
  });

export const Route = createFileRoute("/product/$id")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(productQuery(params.id));
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.name} — Reserve now` },
          {
            name: "description",
            content: loaderData.short_description || `Reserve ${loaderData.name} online.`,
          },
          { property: "og:title", content: loaderData.name },
          {
            property: "og:description",
            content: loaderData.short_description || `Reserve ${loaderData.name} online.`,
          },
          ...(loaderData.image_url
            ? [{ property: "og:image", content: loaderData.image_url }]
            : []),
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
      <Link to="/" className="text-primary underline">
        Back to browse
      </Link>
    </div>
  ),
});

function ProductPage() {
  const { id } = Route.useParams();
  const { data: product } = useSuspenseQuery(productQuery(id));
  const reserve = useServerFn(createReservation);
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  if (!product) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;
    setSubmitting(true);
    try {
      await reserve({
        data: {
          product_id: product.id,
          customer_name: form.name,
          customer_email: form.email,
          customer_phone: form.phone,
          notes: form.notes || undefined,
        },
      });
      toast.success("Reservation confirmed! Check your email.");
      setForm({ name: "", email: "", phone: "", notes: "" });
      router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reserve");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <header className="border-b bg-card">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to browse
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-8 px-4 py-8 md:grid-cols-2">
        <ProductGallery images={((product.image_urls?.length ? product.image_urls : product.image_url ? [product.image_url] : []) as string[])} name={product.name} />


        <div>
          <h1 className="text-3xl font-bold">{product.name}</h1>
          {product.short_description && (
            <p className="mt-2 text-muted-foreground">{product.short_description}</p>
          )}
          <p className="mt-4 text-3xl font-bold">KSh {Number(product.offer_price).toLocaleString()}</p>
          {product.description && (
            <p className="mt-4 whitespace-pre-wrap text-sm">{product.description}</p>
          )}

          <div className="mt-8 rounded-lg border p-5">
            {product.is_reserved ? (
              <div className="text-center text-muted-foreground">
                This item is already reserved.
              </div>
            ) : (
              <>
                <h2 className="font-semibold">Reserve this item</h2>
                <form onSubmit={onSubmit} className="mt-4 space-y-3">
                  <div>
                    <Label htmlFor="name">Full name</Label>
                    <Input
                      id="name"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      maxLength={120}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      maxLength={255}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      maxLength={40}
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      maxLength={1000}
                      rows={3}
                    />
                  </div>
                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting ? "Reserving..." : "Reserve now"}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
