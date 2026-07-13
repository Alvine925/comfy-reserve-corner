import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listActiveProducts } from "@/lib/products.functions";
import { PRODUCT_CATEGORIES, categoryLabel } from "@/lib/product-categories";
import { CATEGORY_ICON_COMPONENTS } from "@/lib/category-icons-map";
import { cleanName } from "@/lib/name-utils";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { LayoutGrid, Search, SlidersHorizontal } from "lucide-react";

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
        content: "Browse quality pre-owned furniture and reserve your favourite pieces online.",
      },
      { property: "og:title", content: "Furniture for Sale — Browse & Reserve" },
      {
        property: "og:description",
        content: "Browse quality pre-owned furniture and reserve your favourite pieces online.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery),
  component: Browse,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-destructive">
      Failed to load products: {error.message}
    </div>
  ),
});

type AvailabilityFilter = "all" | "available" | "reserved";

function Browse() {
  const { data: products } = useSuspenseQuery(productsQuery);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilityFilter>("all");
  const [query, setQuery] = useState("");

  const tiles = useMemo(() => {
    return PRODUCT_CATEGORIES.map((cat) => {
      const items = products.filter((p) => (p as any).category === cat.value);
      const image = items.find((p) => p.image_url)?.image_url ?? null;
      return { ...cat, count: items.length, image };
    }).filter((c) => c.count > 0);
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!activeCategory) return [];
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if ((p as any).category !== activeCategory) return false;
      if (availability === "available" && p.is_reserved) return false;
      if (availability === "reserved" && !p.is_reserved) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.short_description ?? "").toLowerCase().includes(q)
      );
    });
  }, [products, activeCategory, query, availability]);

  const activeTile = tiles.find((t) => t.value === activeCategory);

  function selectCategory(value: string) {
    setActiveCategory(value);
    setQuery("");
    setAvailability("all");
  }

  function clearCategory() {
    setActiveCategory(null);
    setQuery("");
    setAvailability("all");
  }

  // ── Category grid ─────────────────────────────────────────────
  if (!activeCategory) {
    return (
      <div className="min-h-screen bg-background">
        <header>
          <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
              Furniture Collection
            </h1>
            <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm sm:mt-2">
              Browse our pieces by category and reserve the one you love.
            </p>
          </div>

          {tiles.length > 0 && (
            <div className="mx-auto max-w-6xl px-4 pb-6">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
                {tiles.map((cat) => {
                  const Icon = CATEGORY_ICON_COMPONENTS[cat.value] ?? LayoutGrid;
                  return (
                    <FilterPill
                      key={cat.value}
                      active={false}
                      label={cat.label}
                      icon={<Icon className="h-3.5 w-3.5" />}
                      count={cat.count}
                      onClick={() => selectCategory(cat.value)}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-28">
          {tiles.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No products available yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-6 sm:gap-y-10 sm:grid-cols-3">
              {tiles.map((cat) => {
                const Icon = CATEGORY_ICON_COMPONENTS[cat.value] ?? LayoutGrid;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => selectCategory(cat.value)}
                    className="group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
                  >
                    {/* Image — no card box, just the image itself */}
                    <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted/30">
                      {cat.image ? (
                        <img
                          src={cat.image}
                          alt={cat.label}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-muted/20 transition-colors group-hover:bg-muted/40">
                          <Icon
                            className="h-12 w-12 text-foreground/30 transition-all duration-300 group-hover:scale-110 group-hover:text-foreground/50"
                            strokeWidth={1.25}
                          />
                        </div>
                      )}
                    </div>
                    {/* Label — direct on background, no card wrapper */}
                    <div className="mt-2.5 flex items-start justify-between gap-1.5">
                      <div>
                        <p className="flex items-center gap-1 text-xs font-semibold text-foreground sm:text-sm sm:gap-1.5">
                          <Icon className="h-3 w-3 shrink-0 text-muted-foreground sm:h-3.5 sm:w-3.5" strokeWidth={1.75} />
                          {cat.label}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground sm:text-xs">
                          {cat.count} item{cat.count !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <span className="mt-0.5 text-xs text-muted-foreground transition-colors group-hover:text-foreground sm:text-sm">
                        →
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </main>
      </div>
    );
  }

  // ── Product list within a category ────────────────────────────
  const CatIcon = CATEGORY_ICON_COMPONENTS[activeCategory] ?? LayoutGrid;
  const availableCount = products.filter(
    (p) => (p as any).category === activeCategory && !p.is_reserved,
  ).length;
  const reservedCount = products.filter(
    (p) => (p as any).category === activeCategory && p.is_reserved,
  ).length;

  return (
    <div className="min-h-screen bg-background">
      <header>
        <div className="mx-auto max-w-6xl px-4 pt-8 pb-6">
          <button
            type="button"
            onClick={clearCategory}
            className="mb-5 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← All categories
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <CatIcon className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {activeTile?.label ?? categoryLabel(activeCategory)}
              </h1>
              <span className="text-sm text-muted-foreground">
                · {filteredProducts.length}
              </span>
            </div>
            <div className="relative max-w-xs w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                placeholder={`Search ${activeTile?.label.toLowerCase() ?? ""}…`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Sub-filters row */}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <span className="shrink-0 text-xs text-muted-foreground">Jump:</span>
              {tiles
                .filter((t) => t.value !== activeCategory)
                .map((cat) => {
                  const JIcon = CATEGORY_ICON_COMPONENTS[cat.value] ?? LayoutGrid;
                  return (
                    <FilterPill
                      key={cat.value}
                      active={false}
                      label={cat.label}
                      icon={<JIcon className="h-3.5 w-3.5" />}
                      count={cat.count}
                      onClick={() => selectCategory(cat.value)}
                    />
                  );
                })}
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              <span className="text-xs text-muted-foreground">Show:</span>
              <FilterPill active={availability === "all"} label="All" onClick={() => setAvailability("all")} />
              <FilterPill active={availability === "available"} label="Available" count={availableCount} onClick={() => setAvailability("available")} />
              <FilterPill active={availability === "reserved"} label="Reserved" count={reservedCount} onClick={() => setAvailability("reserved")} />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-28">
        {filteredProducts.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No items match your filters.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-3">
            {filteredProducts.map((p) => (
              <Link
                key={p.id}
                to="/product/$id"
                params={{ id: p.id }}
                className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
              >
                <div className="relative aspect-square overflow-hidden rounded-xl bg-muted/25">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={cleanName(p.name)}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted/20">
                      <CatIcon className="h-8 w-8 text-muted-foreground/30 sm:h-10 sm:w-10" strokeWidth={1.25} />
                    </div>
                  )}
                  {p.is_reserved && (
                    <span className="absolute top-1.5 right-1.5 rounded-full bg-black/60 px-1.5 py-px text-[10px] font-medium text-white backdrop-blur-sm sm:top-2 sm:right-2 sm:px-2">
                      Reserved
                    </span>
                  )}
                </div>
                <div className="mt-2 sm:mt-3">
                  <h2 className="text-xs font-semibold leading-snug text-foreground group-hover:text-primary transition-colors sm:text-sm">
                    {cleanName(p.name)}
                  </h2>
                  {p.short_description && (
                    <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground sm:text-xs">
                      {p.short_description}
                    </p>
                  )}
                  <p className="mt-1 text-xs font-bold text-foreground sm:mt-1.5 sm:text-sm">
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

// ── Filter pill ────────────────────────────────────────────────
interface FilterPillProps {
  active: boolean;
  label: string;
  icon?: React.ReactNode;
  count?: number;
  onClick: () => void;
  disabled?: boolean;
}

function FilterPill({ active, label, icon, count, onClick, disabled }: FilterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-transparent text-muted-foreground hover:border-foreground/40 hover:text-foreground",
        disabled && "cursor-default opacity-50",
      )}
    >
      {icon}
      {label}
      {count !== undefined && (
        <span
          className={cn(
            "rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums",
            active ? "bg-background/20 text-background" : "text-muted-foreground",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
