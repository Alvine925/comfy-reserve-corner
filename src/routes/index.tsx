import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listActiveProducts } from "@/lib/products.functions";
import { Input } from "@/components/ui/input";

const productsQuery = queryOptions({
  queryKey: ["products", "active"],
  queryFn: () => listActiveProducts(),
});

const CATEGORIES = [
  { key: "all", label: "All", match: () => true },
  { key: "chairs", label: "Chairs", match: (n: string) => /chair|stool|seat/i.test(n) },
  { key: "tables", label: "Tables", match: (n: string) => /table|desk/i.test(n) },
  { key: "sofas", label: "Sofas", match: (n: string) => /sofa|couch|lounge/i.test(n) },
  { key: "storage", label: "Storage", match: (n: string) => /cabinet|shelf|drawer|storage|wardrobe|bookcase/i.test(n) },
  { key: "beds", label: "Beds", match: (n: string) => /bed|mattress/i.test(n) },
] as const;

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
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");

  const filtered = useMemo(() => {
    const cat = CATEGORIES.find((c) => c.key === category) ?? CATEGORIES[0];
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (!cat.match(p.name)) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.short_description ?? "").toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [products, query, category]);

  return (
    <div className="min-h-screen bg-background">
      <header>
        <div className="mx-auto max-w-6xl px-4 py-8">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Furniture Collection</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Browse our pieces and reserve the one you love.
          </p>

          <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Input
              type="search"
              placeholder="Search furniture..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="max-w-sm"
            />
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategory(c.key)}
                  className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                    category === c.key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            No items match your search.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <Link
                key={p.id}
                to="/product/$id"
                params={{ id: p.id }}
                className="group block"
              >
                <div className="aspect-square overflow-hidden bg-muted/30">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      No image
                    </div>
                  )}
                </div>
                <div className="pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-lg font-semibold text-foreground">{p.name}</h2>
                    {p.is_reserved && (
                      <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                        Reserved
                      </span>
                    )}
                  </div>
                  {p.short_description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {p.short_description}
                    </p>
                  )}
                  <p className="mt-3 text-lg font-bold text-primary">
                    KSh {Number(p.offer_price).toLocaleString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
