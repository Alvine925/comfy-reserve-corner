import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShoppingBag, X, Trash2, FileText } from "lucide-react";
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
import {
  printReservationDocument,
  generateReference,
  formatDocDate,
  type ReservationDocData,
} from "@/lib/reservation-document";

export function CartDrawer() {
  const { items, removeItem, clearCart, total, isOpen, closeCart } = useCart();
  const reserve = useServerFn(createCartReservation);
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "", contact_method: "email" });
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<ReservationDocData | null>(null);

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
          contact_method: form.contact_method,
        },
      });

      const docData: ReservationDocData = {
        reference: generateReference(),
        date: formatDocDate(new Date()),
        customer: {
          name: form.name,
          email: form.email,
          phone: form.phone,
          notes: form.notes || undefined,
        },
        items: items.map((i) => ({
          productName: cleanName(i.productName),
          serialNumber: i.serialNumber,
          price: i.price,
          category: i.category,
        })),
        total,
      };

      setConfirmed(docData);
      clearCart();
      setForm({ name: "", email: "", phone: "", notes: "", contact_method: "email" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reservation failed");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    closeCart();
    setTimeout(() => setConfirmed(null), 300);
  }

  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent className="flex w-full flex-col sm:max-w-md overflow-y-auto">
        <SheetHeader className="shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="h-4 w-4" />
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
          <div className="flex flex-1 flex-col gap-5 py-6 overflow-y-auto">
            {/* Status header */}
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-foreground">Reservation confirmed</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Ref: <span className="font-mono font-semibold">{confirmed.reference}</span>
              </p>
            </div>

            {/* Items summary */}
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Items reserved
              </p>
              <div className="space-y-2">
                {confirmed.items.map((item) => (
                  <div key={item.serialNumber} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{item.productName}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">S/N: {item.serialNumber}</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold">
                      KSh {Number(item.price).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between border-t pt-3">
                <span className="text-xs text-muted-foreground">Total</span>
                <span className="text-sm font-bold">KSh {confirmed.total.toLocaleString()}</span>
              </div>
            </div>

            <Separator />

            {/* T&C notice */}
            <div className="py-1 text-[11.5px] leading-relaxed text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Please read before proceeding</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Reservations go to the <strong>highest bidder</strong> — this is not a guaranteed purchase.</li>
                <li>Your reservation is valid for <strong>7 days</strong> from today.</li>
                <li>Items will be <strong>released</strong> if full payment is not received within that period.</li>
              </ul>
            </div>

            {/* Order document CTA */}
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                className="flex items-center gap-1.5 text-sm font-medium text-foreground underline underline-offset-2 hover:text-primary transition-colors"
                onClick={() => printReservationDocument(confirmed)}
              >
                <FileText className="h-3.5 w-3.5" />
                Download / Print Order Sheet
              </button>
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={handleClose}
              >
                Done — keep browsing
              </button>
            </div>
          </div>
        ) : items.length === 0 ? (
          /* ── Empty state ── */
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
            <ShoppingBag className="h-10 w-10 text-muted-foreground/25" />
            <p className="text-sm text-muted-foreground">Your cart is empty.</p>
            <p className="text-xs text-muted-foreground">
              Browse items and tap a serial number to add them.
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
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted/40">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.productName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Icon className="h-5 w-5 text-muted-foreground/50" strokeWidth={1.5} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold leading-tight">
                        {cleanName(item.productName)}
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        S/N: {item.serialNumber}
                      </p>
                      <p className="mt-0.5 text-sm font-bold">
                        KSh {Number(item.price).toLocaleString()}
                      </p>
                    </div>
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

            <div className="flex items-center justify-between py-3 shrink-0">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-sm font-bold text-foreground">
                KSh {total.toLocaleString()}
              </span>
            </div>

            <Separator />

            {/* Contact form */}
            <div className="flex-1 space-y-3 py-4 overflow-y-auto">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Your details
              </p>
              <div>
                <Label htmlFor="cart-name" className="text-xs">Full name</Label>
                <Input
                  id="cart-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  maxLength={120}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="cart-email" className="text-xs">Email</Label>
                <Input
                  id="cart-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  maxLength={255}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="cart-phone" className="text-xs">Phone</Label>
                <Input
                  id="cart-phone"
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  maxLength={40}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="cart-notes" className="text-xs">Notes (optional)</Label>
                <Textarea
                  id="cart-notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  maxLength={1000}
                  className="text-sm"
                />
              </div>

              {/* Contact preference */}
              <div>
                <Label className="text-xs">Preferred contact method</Label>
                <div className="mt-2 flex gap-3">
                  {(["email", "phone", "whatsapp"] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setForm({ ...form, contact_method: method })}
                      className={`flex-1 rounded-lg border py-2 text-xs font-medium capitalize transition-colors ${
                        form.contact_method === method
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:border-foreground/40"
                      }`}
                    >
                      {method === "whatsapp" ? "WhatsApp" : method.charAt(0).toUpperCase() + method.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* T&C — plain text, no card */}
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                By confirming, you acknowledge that reservations are subject to the highest-bidder policy,
                are valid for <strong>7 days</strong>, and are not guaranteed until full payment is received.
              </p>
            </div>

            {/* Submit */}
            <div className="shrink-0 space-y-2 pt-2 pb-4">
              <Button type="submit" disabled={submitting} className="w-full text-sm">
                {submitting
                  ? "Reserving…"
                  : `Reserve ${items.length} item${items.length !== 1 ? "s" : ""} — KSh ${total.toLocaleString()}`}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-destructive"
                onClick={clearCart}
              >
                <Trash2 className="mr-1.5 h-3 w-3" />
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
      className="fixed bottom-5 right-5 z-50 flex h-13 w-13 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-all hover:opacity-90 hover:shadow-xl active:scale-95 sm:bottom-6 sm:right-6 sm:h-14 sm:w-14"
    >
      <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
  );
}
