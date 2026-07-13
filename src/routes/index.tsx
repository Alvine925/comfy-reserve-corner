import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listActiveProducts } from "@/lib/products.functions";
import { PRODUCT_CATEGORIES, categoryLabel } from "@/lib/product-categories";
import {
  ChairIcon,
  OfficeDeskIcon,
  ExecutiveDeskIcon,
  ReceptionDeskIcon,
  ConferenceTableIcon,
  DiningTableIcon,
  SofaIcon,
  StorageIcon,
  BedIcon,
  OtherFurnitureIcon,
} from "@/lib/category-icons";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { LayoutGrid, Search, SlidersHorizontal } from "lucide-react";

type FurnitureIconComponent = (props: { className?: string; strokeWidth?: number }) => JSX.Element;

const CATEGORY_ICON_COMPONENTS: Record<string, FurnitureIconComponent> = {
  chairs:            ChairIcon,
  office_desks:      OfficeDeskIcon,
  executive_desks:   ExecutiveDeskIcon,
  reception_desks:   ReceptionDeskIcon,
  conference_tables: ConferenceTableIcon,
  dining_tables:     DiningTableIcon,
  sofas:             SofaIcon,
  storage:           StorageIcon,
  beds:              BedIcon,
  other:             OtherFurnitureIcon,
};

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
        content:
          "Browse quality pre-owned furniture and reserve your favourite pieces online.",
      },
      { property: "og:title", content: "Furniture for Sale — Browse & Reserve" },
      {
        property: "og:description",
        content:
          "Browse quality pre-owned furniture and reserve your favourite pieces online.",
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

  // Build category tiles — only show categories that have at least one product
  const tiles = useMemo(() => {
    return PRODUCT_CATEGORIES.map((cat) => {
      const items = products.filter((p) => (p as any).category === cat.value);
      const image = items.find((p) => p.image_url)?.image_url ?? null;
      return { ...cat, count: items.length, image };
    }).filter((c) => c.count > 0);
  }, [products]);

  // Categories that actually have products (for filter pills)
  const activeCategories = useMemo(
    () => tiles.map((t) => t.value),
    [tiles],
  );

  // Products in the selected category, filtered by search + availability
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
        <header className="border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto max-w-6xl px-4 py-10">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              Furniture Collection
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Browse our pieces by category and reserve the one you love.
            </p>
          </div>

          {/* Category filter pills */}
          {tiles.length > 0 && (
            <div className="mx-auto max-w-6xl px-4 pb-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
                <FilterPill
                  active={false}
                  label="All categories"
                  icon={<LayoutGrid className="h-3.5 w-3.5" />}
                  onClick={() => {}}
                  disabled
                />
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

        <main className="mx-auto max-w-6xl px-4 py-8 pb-20">
          {tiles.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
              No products available yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
              {tiles.map((cat) => {
                const Icon =
                  CATEGORY_ICON_COMPONENTS[cat.value] ?? LayoutGrid;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => selectCategory(cat.value)}
                    className="group relative overflow-hidden rounded-2xl border border-border bg-card text-left transition-all hover:shadow-lg hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden bg-muted/40">
                      {cat.image ? (
                        <img
                          src={cat.image}
                          alt={cat.label}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-muted/60 to-muted/20">
                          <div className="rounded-2xl bg-background/70 p-4 shadow-sm ring-1 ring-border/40 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
                            <Icon className="h-10 w-10 text-foreground/70" strokeWidth={1.5} />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="flex items-center gap-1.5 font-semibold text-foreground">
                          <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                          {cat.label}
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
                );
              })}
            </div>
          )}
        </main>
      </div>
    );
  }

  // ── Product list within a category ────────────────────────────
  const Icon = CATEGORY_ICON_COMPONENTS[activeCategory] ?? LayoutGrid;
  const availableCount = products.filter(
    (p) => (p as any).category === activeCategory && !p.is_reserved,
  ).length;
  const reservedCount = products.filter(
    (p) => (p as any).category === activeCategory && p.is_reserved,
  ).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-6xl px-4 pt-6">
          {/* Back + breadcrumb */}
          <button
            type="button"
            onClick={clearCategory}
            className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← All categories
          </button>

          {/* Category heading + search */}
          <div className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-muted p-2.5">
                <Icon className="h-6 w-6 text-foreground/80" strokeWidth={1.75} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {activeTile?.label ?? categoryLabel(activeCategory)}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {filteredProducts.length} item{filteredProducts.length !== 1 ? "s" : ""}
                </p>
              </div>
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

          {/* Category switcher + availability sub-filters */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pb-4">
            {/* Jump to another category */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <span className="shrink-0 text-xs font-medium text-muted-foreground">
                Category:
              </span>
              {tiles
                .filter((t) => t.value !== activeCategory)
                .map((cat) => {
                  const CatIcon =
                    CATEGORY_ICON_COMPONENTS[cat.value] ?? LayoutGrid;
                  return (
                    <FilterPill
                      key={cat.value}
                      active={false}
                      label={cat.label}
                      icon={<CatIcon className="h-3.5 w-3.5" />}
                      count={cat.count}
                      onClick={() => selectCategory(cat.value)}
                    />
                  );
                })}
            </div>

            {/* Availability filter */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-medium text-muted-foreground">
                Show:
              </span>
              <FilterPill
                active={availability === "all"}
                label="All"
                onClick={() => setAvailability("all")}
              />
              <FilterPill
                active={availability === "available"}
                label="Available"
                count={availableCount}
                onClick={() => setAvailability("available")}
              />
              <FilterPill
                active={availability === "reserved"}
                label="Reserved"
                count={reservedCount}
                onClick={() => setAvailability("reserved")}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 pb-20">
        {filteredProducts.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            No items match your filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((p) => (
              <Link
                key={p.id}
                to="/product/$id"
                params={{ id: p.id }}
                className="group block"
              >
                <div className="relative aspect-square overflow-hidden rounded-xl bg-muted/30">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Icon className="h-12 w-12 text-muted-foreground/40" strokeWidth={1.25} />
                    </div>
                  )}
                  {p.is_reserved && (
                    <span className="absolute top-2 right-2 rounded-full bg-background/90 border border-border px-2 py-0.5 text-xs text-muted-foreground backdrop-blur-sm">
                      Reserved
                    </span>
                  )}
                </div>
                <div className="pt-3">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base font-semibold text-foreground leading-snug">
                      {p.name}
                    </h2>
                  </div>
                  {(p as any).serial_number && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                      <span className="text-[9px] uppercase tracking-wider">
                        S/N
                      </span>
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

// ── Shared filter pill component ───────────────────────────────
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
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
        disabled && "cursor-default opacity-60",
      )}
    >
      {icon}
      {label}
      {count !== undefined && (
        <span
          className={cn(
            "rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums",
            active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
