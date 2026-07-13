// Shared product category definitions used by admin dashboard and browse page.
// Keep this the single source of truth — import from here everywhere.

export const PRODUCT_CATEGORIES = [
  { value: "chairs",            label: "Chairs" },
  { value: "office_desks",      label: "Office Desks" },
  { value: "executive_desks",   label: "Executive Desks" },
  { value: "reception_desks",   label: "Reception Desks" },
  { value: "conference_tables", label: "Conference Tables" },
  { value: "dining_tables",     label: "Dining Tables" },
  { value: "sofas",             label: "Sofas" },
  { value: "storage",           label: "Storage & Cabinets" },
  { value: "beds",              label: "Beds" },
  { value: "other",             label: "Other" },
] as const;

export type ProductCategoryValue = (typeof PRODUCT_CATEGORIES)[number]["value"];

export function categoryLabel(value: string | null | undefined): string {
  if (!value) return "Uncategorised";
  return PRODUCT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

/** Legacy emoji map — kept for any existing references outside the browse page */
export const CATEGORY_ICONS: Record<string, string> = {
  chairs:            "🪑",
  office_desks:      "🖥️",
  executive_desks:   "💼",
  reception_desks:   "🛎️",
  conference_tables: "📋",
  dining_tables:     "🍽️",
  sofas:             "🛋️",
  storage:           "🗄️",
  beds:              "🛏️",
  other:             "📦",
};
