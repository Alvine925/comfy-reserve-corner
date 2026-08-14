import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listActiveProducts } from "@/lib/products.functions";
import { PRODUCT_CATEGORIES, categoryLabel } from "@/lib/product-categories";
import { CATEGORY_ICON_COMPONENTS } from "@/lib/category-icons-map";
import { cleanName } from "@/lib/name-utils";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { LayoutGrid, Search, SlidersHorizontal, X, Check, Eye, Heart } from "lucide-react";

// ── Chair sub-category helpers ─────────────────────────────────
const CHAIR_SUB_CATEGORIES = [
  { value: "mb",  label: "Office Chair MB (Medium Back)" },
  { value: "vis", label: "Office Chair VIS (Visitor)" },
  { value: "other", label: "Other Chairs" },
] as const;

type ChairSubCategoryValue = (typeof CHAIR_SUB_CATEGORIES)[number]["value"];

function getChairSubCategory(name: string): ChairSubCategoryValue {
  const u = name.toUpperCase();
  if (u.includes(" MB ") || u.includes(" MB(") || u.includes("(MB)")) return "mb";
  if (u.includes(" VIS ") || u.includes(" VIS(") || u.includes("(VIS)") || u.includes("VIS ")) return "vis";
  return "other";
}

// Distinct accent color per category (text class for label + icon)
const CATEGORY_COLORS: Record<string, string> = {
  chairs:            "text-amber-600",
  office_desks:      "text-sky-600",
  executive_desks:   "text-violet-600",
  reception_desks:   "text-teal-600",
  conference_tables: "text-rose-600",
  dining_tables:     "text-orange-600",
  sofas:             "text-indigo-600",
  storage:           "text-stone-600",
  beds:              "text-pink-600",
  other:             "text-gray-500",
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
  const [chairSubCategory, setChairSubCategory] = useState<ChairSubCategoryValue | null>(null);
  const [availability, setAvailability] = useState<AvailabilityFilter>("all");
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  const tiles = useMemo(() => {
    return PRODUCT_CATEGORIES.map((cat) => {
      const items = products.filter((p) => (p as any).category === cat.value);
      const image = items.find((p) => p.image_url)?.image_url ?? null;
      return { ...cat, count: items.length, image };
    }).filter((c) => c.count > 0);
  }, [products]);

  // Chair sub-category tiles (only used when activeCategory === "chairs")
  const chairSubTiles = useMemo(() => {
    const chairProducts = products.filter((p) => (p as any).category === "chairs");
    return CHAIR_SUB_CATEGORIES.map((sub) => {
      const items = chairProducts.filter((p) => getChairSubCategory(p.name) === sub.value);
      const image = items.find((p) => p.image_url)?.image_url ?? null;
      return { ...sub, count: items.length, image };
    }).filter((s) => s.count > 0);
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!activeCategory) return [];
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if ((p as any).category !== activeCategory) return false;
      if (activeCategory === "chairs" && chairSubCategory && getChairSubCategory(p.name) !== chairSubCategory) return false;
      if (availability === "available" && p.is_reserved) return false;
      if (availability === "reserved" && !p.is_reserved) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.short_description ?? "").toLowerCase().includes(q)
      );
    });
  }, [products, activeCategory, chairSubCategory, query, availability]);

  const activeTile = tiles.find((t) => t.value === activeCategory);
  const activeChairSubTile = chairSubTiles.find((s) => s.value === chairSubCategory);

  function selectCategory(value: string) {
    setActiveCategory(value);
    setChairSubCategory(null);
    setQuery("");
    setAvailability("all");
  }

  function clearCategory() {
    setActiveCategory(null);
    setChairSubCategory(null);
    setQuery("");
    setAvailability("all");
  }

  function clearChairSubCategory() {
    setChairSubCategory(null);
    setQuery("");
    setAvailability("all");
  }

  const availableCount = filteredProducts.filter((p) => !p.is_reserved).length;
  const reservedCount = filteredProducts.filter((p) => p.is_reserved).length;

  // Count available units per product name (for "Only X left" badge)
  const nameAvailableCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      if (!p.is_reserved) map.set(p.name, (map.get(p.name) ?? 0) + 1);
    }
    return map;
  }, [products]);

  // Count active non-default filters (for the badge on the mobile filter button)
  const activeFilterCount = (availability !== "all" ? 1 : 0);

  // ── Category grid ─────────────────────────────────────────────
  if (!activeCategory) {
    return (
      <div className="min-h-screen bg-background">
        <header>
          <div className="mx-auto max-w-6xl px-4 pt-10 pb-4 sm:pt-16 sm:pb-6">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700 sm:text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              Live bidding · Highest offer wins
            </p>
            <h1 className="mt-3 text-xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-3xl md:text-4xl">
              Handpicked office furniture,{" "}
              <span className="italic text-amber-700">reimagined prices.</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Gently used office pieces — heavily maintained, honestly depreciated, and ready for
              a second workspace. Browse by category, place your offer, and reserve the one that
              fits your setup.
            </p>



            {/* Filter bar — Browse button on mobile, pills on desktop */}
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilterOpen(true)}
                className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-foreground/40 hover:text-foreground sm:hidden"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Browse categories
              </button>
              {tiles.length > 0 && (
                <div className="hidden sm:flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
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
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-28">
          {tiles.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No products available yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-10">
              {tiles.map((cat) => {
                const Icon = CATEGORY_ICON_COMPONENTS[cat.value] ?? LayoutGrid;
                return (
                  <div
                    key={cat.value}
                    className="group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
                  >
                    <button
                      type="button"
                      onClick={() => selectCategory(cat.value)}
                      aria-label={`View ${cat.label} category`}
                      className="block aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
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
                    </button>
                    <div className="mt-2.5 flex items-start justify-between gap-1.5">
                      <div>
                        <p className={cn(
                          "flex items-center gap-1 text-xs font-semibold sm:gap-1.5 sm:text-sm",
                          CATEGORY_COLORS[cat.value] ?? "text-foreground",
                        )}>
                          <Icon className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" strokeWidth={1.75} />
                          {cat.label}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground sm:text-xs">
                          {cat.count} item{cat.count !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <span className={cn(
                        "mt-0.5 text-xs sm:text-sm transition-colors",
                        CATEGORY_COLORS[cat.value] ?? "text-muted-foreground",
                      )}>
                        →
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => selectCategory(cat.value)}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-[11px] font-semibold text-background transition-colors hover:bg-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:text-xs"
                    >
                      Open category
                      <span aria-hidden="true">→</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* ── Category grid filter sheet ── */}
        <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
          <SheetContent side="bottom" className="rounded-t-2xl px-0 pb-safe max-h-[80vh] overflow-y-auto">
            <SheetHeader className="px-5 pb-2">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-base font-semibold">Browse by category</SheetTitle>
                <button
                  type="button"
                  onClick={() => setFilterOpen(false)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </SheetHeader>
            <div className="px-5 pt-4 pb-8 space-y-2">
              {tiles.map((cat) => {
                const Icon = CATEGORY_ICON_COMPONENTS[cat.value] ?? LayoutGrid;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => { selectCategory(cat.value); setFilterOpen(false); }}
                    className="flex w-full items-center justify-between rounded-xl bg-muted/40 px-4 py-3 text-sm font-medium text-foreground transition-all hover:bg-muted/70"
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                      {cat.label}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">{cat.count}</span>
                  </button>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // ── Product list within a category ────────────────────────────
  const CatIcon = CATEGORY_ICON_COMPONENTS[activeCategory] ?? LayoutGrid;

  // ── Chair sub-category tile view ──────────────────────────────
  if (activeCategory === "chairs" && !chairSubCategory) {
    return (
      <div className="min-h-screen bg-background">
        <header>
          <div className="mx-auto max-w-6xl px-4 pt-6 pb-4 sm:pt-8 sm:pb-6">
            <button
              type="button"
              onClick={clearCategory}
              className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors sm:mb-5"
            >
              ← All categories
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <CatIcon className="h-4 w-4 shrink-0 text-muted-foreground sm:h-5 sm:w-5" strokeWidth={1.75} />
              <h1 className="truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Chairs
              </h1>
            </div>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Select a chair type to browse.</p>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-28">
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-10">
            {chairSubTiles.map((sub) => (
              <div
                key={sub.value}
                className="group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
              >
                <button
                  type="button"
                  onClick={() => setChairSubCategory(sub.value)}
                  aria-label={`View ${sub.label} category`}
                  className="block aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  {sub.image ? (
                    <img
                      src={sub.image}
                      alt={sub.label}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted/20 transition-colors group-hover:bg-muted/40">
                      <CatIcon className="h-12 w-12 text-foreground/30 transition-all duration-300 group-hover:scale-110 group-hover:text-foreground/50" strokeWidth={1.25} />
                    </div>
                  )}
                </button>
                <div className="mt-2.5 flex items-start justify-between gap-1.5">
                  <div>
                    <p className="flex items-center gap-1 text-xs font-semibold text-amber-600 sm:gap-1.5 sm:text-sm">
                      <CatIcon className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" strokeWidth={1.75} />
                      {sub.label}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground sm:text-xs">
                      {sub.count} item{sub.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="mt-0.5 text-xs text-amber-600 transition-colors sm:text-sm">→</span>
                </div>
                <button
                  type="button"
                  onClick={() => setChairSubCategory(sub.value)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-[11px] font-semibold text-background transition-colors hover:bg-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:text-xs"
                >
                  Open sub category
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header>
        <div className="mx-auto max-w-6xl px-4 pt-6 pb-4 sm:pt-8 sm:pb-6">
          {/* Breadcrumb — back to sub-categories if inside chairs, else back to all */}
          {activeCategory === "chairs" && chairSubCategory ? (
            <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground sm:mb-5">
              <button type="button" onClick={clearCategory} className="hover:text-foreground transition-colors">
                All categories
              </button>
              <span>/</span>
              <button type="button" onClick={clearChairSubCategory} className="hover:text-foreground transition-colors">
                Chairs
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={clearCategory}
              className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors sm:mb-5"
            >
              ← All categories
            </button>
          )}

          {/* Title row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <CatIcon className="h-4 w-4 shrink-0 text-muted-foreground sm:h-5 sm:w-5" strokeWidth={1.75} />
              <h1 className="truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {activeChairSubTile?.label ?? activeTile?.label ?? categoryLabel(activeCategory)}
              </h1>
              <span className="shrink-0 text-sm text-muted-foreground">
                · {filteredProducts.length}
              </span>
            </div>

            {/* Filter button — always visible */}
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className={cn(
                "relative flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                activeFilterCount > 0
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filter
              {activeFilterCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-background/20 text-[10px] font-bold text-background">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Search bar */}
          <div className="mt-3 relative sm:mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder={`Search ${activeTile?.label.toLowerCase() ?? ""}…`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-9 text-sm sm:max-w-xs"
            />
          </div>

          {/* Desktop inline filters */}
          <div className="mt-4 hidden sm:flex flex-wrap items-center gap-x-5 gap-y-2">
            {/* Category jump */}
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

            {/* Availability */}
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
              <article
                key={p.id}
                className="group"
              >
                <Link
                  to="/product/$id"
                  params={{ id: p.id }}
                  aria-label={`View details for ${cleanName(p.name)}`}
                  className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
                    {!p.is_reserved && (() => {
                      const left = nameAvailableCount.get(p.name) ?? 0;
                      if (left > 3) return null;
                      return (
                        <span className="absolute bottom-1.5 left-1.5 rounded-full bg-orange-500 px-1.5 py-px text-[10px] font-bold text-white shadow sm:bottom-2 sm:left-2 sm:px-2">
                          {left === 1 ? "Last one!" : `Only ${left} left!`}
                        </span>
                      );
                    })()}
                  </div>
                </Link>
                <div className="mt-2 sm:mt-3">
                  <h2 className="text-xs font-semibold leading-snug text-violet-800 transition-colors group-hover:text-violet-600 sm:text-sm">
                    <Link to="/product/$id" params={{ id: p.id }} className="focus-visible:outline-none focus-visible:underline">
                      {cleanName(p.name)}
                    </Link>
                  </h2>
                  {p.short_description && (
                    <p className="mt-0.5 line-clamp-1 text-[10px] text-teal-600 sm:text-xs">
                      {p.short_description}
                    </p>
                  )}
                  {(p as any).serial_number && (
                    <p className="mt-0.5 font-mono text-[10px] text-indigo-500 sm:text-xs">
                      S/N: {(p as any).serial_number}
                    </p>
                  )}
                  <p className="mt-1 text-xs font-bold text-emerald-600 sm:mt-1.5 sm:text-sm">
                    KSh {Number(p.offer_price).toLocaleString()}
                  </p>
                  {(p as any).acquisition_price != null && (() => {
                    const dep = Math.round((1 - Number(p.offer_price) / Number((p as any).acquisition_price)) * 100);
                    return (
                      <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <p className="text-[10px] text-amber-600 sm:text-xs">
                          Acq: KSh {Number((p as any).acquisition_price).toLocaleString()}
                        </p>
                        <span className="rounded-full bg-red-100 px-1.5 py-px text-[9px] font-bold text-red-600 sm:text-[10px]">
                          -{dep}% dep.
                        </span>
                      </div>
                    );
                  })()}
                  <div className="mt-1 flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[10px] text-slate-400 sm:text-xs">
                      <Eye className="h-3 w-3" />
                      {((p as any).views ?? 0).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-rose-400 sm:text-xs">
                      <Heart className="h-3 w-3 fill-rose-400" />
                      {((p as any).likes ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <Link
                    to="/product/$id"
                    params={{ id: p.id }}
                    className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-[11px] font-semibold text-background transition-colors hover:bg-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:text-xs"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View details
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* ── Mobile filter bottom sheet ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-0 pb-safe max-h-[80vh] overflow-y-auto">
          <SheetHeader className="px-5 pb-2">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base font-semibold">Filter &amp; Browse</SheetTitle>
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </SheetHeader>

          <div className="px-5 pt-4 pb-8 space-y-7">
            {/* Availability */}
            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Availability
              </p>
              <div className="space-y-1.5">
                {(
                  [
                    { value: "all", label: "Show all" },
                    { value: "available", label: "Available only", count: availableCount },
                    { value: "reserved", label: "Reserved only", count: reservedCount },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setAvailability(opt.value);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all",
                      availability === opt.value
                        ? "bg-foreground text-background"
                        : "bg-muted/40 text-foreground hover:bg-muted/70",
                    )}
                  >
                    <span>{opt.label}</span>
                    <div className="flex items-center gap-2">
                      {"count" in opt && (
                        <span className={cn(
                          "text-xs tabular-nums",
                          availability === opt.value ? "text-background/70" : "text-muted-foreground",
                        )}>
                          {opt.count}
                        </span>
                      )}
                      {availability === opt.value && (
                        <Check className="h-4 w-4" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Category switcher */}
            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Jump to category
              </p>
              <div className="space-y-1.5">
                {tiles.map((cat) => {
                  const Icon = CATEGORY_ICON_COMPONENTS[cat.value] ?? LayoutGrid;
                  const isCurrent = cat.value === activeCategory;
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => {
                        selectCategory(cat.value);
                        setFilterOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all",
                        isCurrent
                          ? "bg-foreground text-background"
                          : "bg-muted/40 text-foreground hover:bg-muted/70",
                      )}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon
                          className={cn("h-4 w-4", isCurrent ? "text-background/80" : "text-muted-foreground")}
                          strokeWidth={1.75}
                        />
                        {cat.label}
                      </span>
                      <span className={cn(
                        "text-xs tabular-nums",
                        isCurrent ? "text-background/70" : "text-muted-foreground",
                      )}>
                        {cat.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Done button */}
            <button
              type="button"
              onClick={() => setFilterOpen(false)}
              className="w-full rounded-xl bg-foreground py-3 text-sm font-semibold text-background transition-opacity hover:opacity-80"
            >
              Show {filteredProducts.length} result{filteredProducts.length !== 1 ? "s" : ""}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ── Filter pill (desktop) ──────────────────────────────────────
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
        <span className={cn(
          "rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums",
          active ? "bg-background/20 text-background" : "text-muted-foreground",
        )}>
          {count}
        </span>
      )}
    </button>
  );
}
