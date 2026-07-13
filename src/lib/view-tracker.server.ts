// Server-only: in-memory daily view tracker.
// Resets on server restart — fine for a sales/ops tool.
const cache = new Map<string, { count: number; date: string }>();

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getDailyViews(id: string): number {
  const entry = cache.get(id);
  if (!entry || entry.date !== today()) return 0;
  return entry.count;
}

export function incrementDailyViews(id: string): number {
  const t = today();
  const entry = cache.get(id);
  if (!entry || entry.date !== t) {
    cache.set(id, { count: 1, date: t });
    return 1;
  }
  entry.count += 1;
  return entry.count;
}
