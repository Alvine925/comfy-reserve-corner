import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShoppingBag, X, Trash2, CheckCircle2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/lib/cart-context";
import { createCartReservation } from "@/lib/products.functions";
import { cleanName } from "@/lib/name-utils";
import { CATEGORY_ICON_COMPONENTS } from "@/lib/category-icons-map";
import { LayoutGrid } from "lucide-react";

export function CartDrawer() {
  const { items, removeItem, clearCart, total, isOpen, closeCart } = useCart();
  const reserve = useServerFn(createCartReservation);
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<{ serials: string[] } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return;
    setSubmitting(true);
    try {
      await reserve({
        data: {
          items: items.map((i) => ({ unit_id: i.unitId })),
          customer_name: form.name,
          customer_email: form.email,
          customer_phone: form.phone,
          notes: form.notes || undefined,
        },
      });
      setConfirmed({ serials: items.map((i) => i.serialNumber) });
      clearCart();
      setForm({ name: "", email: "", phone: "", notes: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reservation failed");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    closeCart();
    // reset confirmed state after close animation
    setTimeout(() => setConfirmed(null), 300);
  }

  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent className="flex w-full flex-col sm:max-w-md overflow-y-auto">
        <SheetHeader className="shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Reservation Cart
            {items.length > 0 && !confirmed && (
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                {items.length} item{items.length !== 1 ? "s" : ""}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {confirmed ? (
          /* ── Success state ── */
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
            <CheckCircle2 className="h-14 w-14 text-green-500" />
            <h3 className="text-lg font-semibold text-foreground">Reservations confirmed!</h3>
            <p className="text-sm text-muted-foreground">
              A confirmation email is on its way to you. Keep your serial numbers safe.
            </p>
            <div className="w-full rounded-lg border bg-muted/30 p-4 text-left">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Reserved serials
              </p>
              {confirmed.serials.map((s) => (
                <p key={s} className="font-mono text-sm font-semibold">{s}</p>
              ))}
            </div>
            <Button variant="outline" className="mt-2 w-full" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : items.length === 0 ? (
          /* ── Empty state ── */
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Your cart is empty.</p>
            <p className="text-xs text-muted-foreground">
              Browse products and select a serial number to add items.
            </p>
            <Button variant="outline" size="sm" className="mt-2" onClick={handleClose}>
              Browse products
            </Button>
          </div>
        ) : (
          /* ── Cart items + form ── */
          <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-0 min-h-0">
            {/* Items list */}
            <div className="shrink-0 space-y-3 py-4">
              {items.map((item) => {
                const Icon = CATEGORY_ICON_COMPONENTS[item.category ?? ""] ?? LayoutGrid;
                return (
                  <div key={item.unitId} className="flex items-start gap-3">
                    {/* Thumbnail */}
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted/40">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.productName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Icon className="h-6 w-6 text-muted-foreground/50" strokeWidth={1.5} />
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold leading-tight">
                        {cleanName(item.productName)}
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        S/N: {item.serialNumber}
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-primary">
                        KSh {Number(item.price).toLocaleString()}
                      </p>
                    </div>
                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removeItem(item.unitId)}
                      className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Remove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            <Separator />

            {/* Total */}
            <div className="flex items-center justify-between py-3 shrink-0">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-base font-bold text-foreground">
                KSh {total.toLocaleString()}
              </span>
            </div>

            <Separator />

            {/* Contact form */}
            <div className="flex-1 space-y-3 py-4 overflow-y-auto">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Your details
              </p>
              <div>
                <Label htmlFor="cart-name">Full name</Label>
                <Input
                  id="cart-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  maxLength={120}
                />
              </div>
              <div>
                <Label htmlFor="cart-email">Email</Label>
                <Input
                  id="cart-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  maxLength={255}
                />
              </div>
              <div>
                <Label htmlFor="cart-phone">Phone</Label>
                <Input
                  id="cart-phone"
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  maxLength={40}
                />
              </div>
              <div>
                <Label htmlFor="cart-notes">Notes (optional)</Label>
                <Textarea
                  id="cart-notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  maxLength={1000}
                />
              </div>
            </div>

            {/* Submit + clear */}
            <div className="shrink-0 space-y-2 pt-2 pb-4">
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting
                  ? "Reserving…"
                  : `Confirm ${items.length} reservation${items.length !== 1 ? "s" : ""} — KSh ${total.toLocaleString()}`}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground hover:text-destructive"
                onClick={clearCart}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Clear cart
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function CartButton() {
  const { count, openCart } = useCart();
  return (
    <button
      type="button"
      onClick={openCart}
      aria-label={`Open cart (${count} items)`}
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:shadow-xl active:scale-95"
    >
      <ShoppingBag className="h-6 w-6" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[11px] font-bold text-destructive-foreground">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
  );
}
