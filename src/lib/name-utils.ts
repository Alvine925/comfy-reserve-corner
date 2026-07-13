/**
 * Strip trailing batch-number suffixes from product names.
 * Handles patterns like:  "Office Chair #11/21"  →  "Office Chair"
 *                          "Desk #3"              →  "Desk"
 */
export function cleanName(name: string): string {
  return name.replace(/\s*#\d+(?:\/\d+)?$/, "").trim();
}
