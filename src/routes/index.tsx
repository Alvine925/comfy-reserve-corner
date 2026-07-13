import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listActiveProducts } from "@/lib/products.functions";
import { PRODUCT_CATEGORIES, CATEGORY_ICONS, categoryLabel } from "@/lib/product-categories";
import { Input } from "@/components/ui/input";

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
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // Build category tiles — only show categories that have at least one product
  const tiles = useMemo(() => {
    return PRODUCT_CATEGORIES.map((cat) => {
      const items = products.filter((p) => (p as any).category === cat.value);
      const image = items.find((p) => p.image_url)?.image_url ?? null;
      return { ...cat, count: items.length, image };
    }).filter((c) => c.count > 0);
  }, [products]);

  // Products in the selected category, filtered by search
  const filteredProducts = useMemo(() => {
    if (!activeCategory) return [];
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if ((p as any).category !== activeCategory) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.short_description ?? "").toLowerCase().includes(q)
      );
    });
  }, [products, activeCategory, query]);

  const activeTile = tiles.find((t) => t.value === activeCategory);

  // ── Category grid ────────────────────────────────────────────
  if (!activeCategory) {
    return (
      <div className="min-h-screen bg-background">
        <header>
          <div className="mx-auto max-w-6xl px-4 py-10">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              Furniture Collection
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Browse our pieces by category and reserve the one you love.
            </p>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-20">
          {tiles.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
              No products available yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
              {tiles.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => { setActiveCategory(cat.value); setQuery(""); }}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-card text-left transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden bg-muted/40">
                    {cat.image ? (
                      <img
                        src={cat.image}
                        alt={cat.label}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-5xl">
                        {CATEGORY_ICONS[cat.value] ?? "📦"}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-semibold text-foreground">
                        {CATEGORY_ICONS[cat.value]} {cat.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {cat.count} item{cat.count !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <span className="text-lg text-muted-foreground transition-colors group-hover:text-foreground">
                      →
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // ── Product list within a category ───────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <header>
        <div className="mx-auto max-w-6xl px-4 py-8">
          <button
            type="button"
            onClick={() => { setActiveCategory(null); setQuery(""); }}
            className="mb-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← All categories
          </button>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {CATEGORY_ICONS[activeCategory] ?? "📦"} {activeTile?.label ?? categoryLabel(activeCategory)}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {filteredProducts.length} item{filteredProducts.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Input
              type="search"
              placeholder={`Search ${activeTile?.label.toLowerCase() ?? ""}…`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20">
        {filteredProducts.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            No items match your search.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((p) => (
              <Link key={p.id} to="/product/$id" params={{ id: p.id }} className="group block">
                <div className="aspect-square overflow-hidden rounded-xl bg-muted/30">
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
                <div className="pt-3">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base font-semibold text-foreground leading-snug">
                      {p.name}
                    </h2>
                    {p.is_reserved && (
                      <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                        Reserved
                      </span>
                    )}
                  </div>
                  {(p as any).serial_number && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                      <span className="text-[9px] uppercase tracking-wider">S/N</span>
                      {(p as any).serial_number}
                    </span>
                  )}
                  {p.short_description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {p.short_description}
                    </p>
                  )}
                  <p className="mt-2 text-base font-bold text-primary">
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
