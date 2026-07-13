import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listActiveProducts } from "@/lib/products.functions";

const productsQuery = queryOptions({
  queryKey: ["products", "active"],
  queryFn: () => listActiveProducts(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Furniture for Sale — Browse & Reserve" },
      {
        name: "description",
        content: "Browse quality pre-owned furniture and reserve your favorite pieces online.",
      },
      { property: "og:title", content: "Furniture for Sale — Browse & Reserve" },
      {
        property: "og:description",
        content: "Browse quality pre-owned furniture and reserve your favorite pieces online.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery),
  component: Browse,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-destructive">Failed to load products: {error.message}</div>
  ),
});

function Browse() {
  const { data: products } = useSuspenseQuery(productsQuery);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <h1 className="text-3xl font-bold tracking-tight">Furniture Collection</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse our pieces and reserve the one you love.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {products.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            No items available right now. Check back soon.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <Link
                key={p.id}
                to="/product/$id"
                params={{ id: p.id }}
                className="group overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-lg"
              >
                <div className="aspect-square overflow-hidden bg-muted">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      No image
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold">{p.name}</h2>
                    {p.is_reserved && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Reserved</span>
                    )}
                  </div>
                  {p.short_description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {p.short_description}
                    </p>
                  )}
                  <p className="mt-3 text-lg font-bold">${Number(p.offer_price).toFixed(2)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
