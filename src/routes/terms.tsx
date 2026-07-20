import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — Furniture Collection" },
      { name: "description", content: "Terms and conditions for reserving and purchasing pre-owned furniture from our collection." },
      { property: "og:title", content: "Terms & Conditions — Furniture Collection" },
      { property: "og:description", content: "Terms and conditions for reserving and purchasing pre-owned furniture from our collection." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to collection
        </Link>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Terms &amp; Conditions
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Please read carefully before placing a reservation.
        </p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-foreground/90">

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">1. About this sale</h2>
            <p>
              This platform lists pre-owned office and home furniture available for sale.
              All items have been used for approximately <strong>two (2) years</strong> in a working
              office environment, but each piece has been <strong>heavily and carefully maintained</strong>
              — cleaned, inspected, and where necessary refurbished — so that it continues to serve
              its purpose reliably for years to come.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">2. Pricing &amp; depreciation</h2>
            <p>
              The listed price of every item is the <strong>offer price after depreciation</strong> has
              already been calculated and applied. Depending on age, wear, and category, most items
              have been depreciated by <strong>40% to over 50%</strong> of their original acquisition
              value — some considerably more. What you see is what we consider a fair current market
              value for a well-maintained, pre-owned piece.
            </p>
            <p className="mt-3">
              All prices are shown in <strong>Kenyan Shillings (KSh)</strong>.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">3. This is a bidding-style sale</h2>
            <p>
              Every item is sold to the <strong>highest bidder</strong>. Placing a reservation
              secures your interest and puts your offer on record, but it does <strong>not</strong>
              guarantee that you will win the item. If another buyer submits a higher counter-offer
              before you complete payment, they may be awarded the item instead.
            </p>
            <p className="mt-3">
              If you are outbid, we will notify you by email so you have the opportunity to raise
              your offer before the item is released to another buyer.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">4. Reservation period</h2>
            <p>
              A reservation is valid for <strong>seven (7) calendar days</strong> from the date it is
              issued. If full payment is not received within this window, the reservation lapses
              automatically and the item is returned to the available pool.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">5. Payment secures the item</h2>
            <p>
              A reservation only becomes binding once <strong>full payment</strong> has been received
              and confirmed. Until then, the item remains on the open market and may be awarded to
              a higher bidder.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">6. Condition of goods</h2>
            <p>
              All items are pre-owned and sold on an <strong>as-is</strong> basis. Photographs,
              dimensions, and descriptions are provided in good faith to represent each item as
              accurately as possible. Buyers are strongly encouraged to <strong>inspect items in
              person</strong> before completing payment. Once paid for and collected, sales are final.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">7. Collection &amp; delivery</h2>
            <p>
              Buyers are responsible for arranging collection of purchased items unless a delivery
              arrangement has been agreed in writing. Items must be collected within a reasonable
              period after payment is confirmed.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">8. Cancellations</h2>
            <p>
              You may cancel an unpaid reservation at any time by contacting us. Once payment has
              been made, standard final-sale terms apply.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">9. Non-transferable</h2>
            <p>
              Reservations are personal and cannot be transferred to a third party without our
              written consent.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">10. Communication</h2>
            <p>
              By reserving an item you agree that we may contact you by email or phone regarding
              your reservation, counter-offers, payment, collection, and closely related matters.
              See our <Link to="/privacy" className="underline underline-offset-4 hover:text-foreground">Privacy Policy</Link> for details on how we handle your information.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">11. Changes to these terms</h2>
            <p>
              We may update these terms from time to time. The version in force is the one published
              on this page at the time your reservation is placed.
            </p>
          </section>

        </div>

        <p className="mt-12 text-xs text-muted-foreground">
          Last updated: July 2026
        </p>
      </div>
    </div>
  );
}
