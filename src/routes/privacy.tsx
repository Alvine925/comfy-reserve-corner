import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Furniture Collection" },
      { name: "description", content: "How we collect, store, and use your personal information when you reserve furniture." },
      { property: "og:title", content: "Privacy Policy — Furniture Collection" },
      { property: "og:description", content: "How we collect, store, and use your personal information when you reserve furniture." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to collection
        </Link>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          What we collect, why we collect it, and how we use it.
        </p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-foreground/90">

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">1. Information we collect</h2>
            <p>
              When you reserve a furniture item, we collect the details you provide directly on the
              reservation form:
            </p>
            <ul className="mt-3 list-disc pl-6 space-y-1.5">
              <li>Your <strong>full name</strong></li>
              <li>Your <strong>email address</strong></li>
              <li>Your <strong>phone number</strong></li>
              <li>Any <strong>notes</strong> you choose to add to your reservation</li>
              <li>The <strong>items you reserved</strong>, the price offered, and the reservation date</li>
            </ul>
            <p className="mt-3">
              We do not ask for, or store, any payment card details on this website.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">2. Why we collect it</h2>
            <p>
              By submitting a reservation, you give us permission to store and use your name, email
              address, and phone number so that we can:
            </p>
            <ul className="mt-3 list-disc pl-6 space-y-1.5">
              <li>Send you a confirmation of your reservation</li>
              <li>Notify you if you have been outbid on an item you reserved</li>
              <li>Follow up with you about payment, collection, or delivery</li>
              <li>Contact you about closely related updates on items you have reserved</li>
              <li>Keep a record of the transaction for our own accounting and dispute resolution</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">3. How we store your information</h2>
            <p>
              Your information is stored securely in our database. Emails are delivered through a
              reputable third-party email service provider (Brevo), which processes your email
              address solely for the purpose of delivering messages from us to you.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">4. Who can see it</h2>
            <p>
              Only authorised administrators of this site can view your reservation details. We do
              not sell, rent, or trade your personal information with third parties for marketing
              purposes.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">5. How long we keep it</h2>
            <p>
              We retain your reservation and contact details for as long as is reasonably necessary
              to complete the sale, respond to any questions or disputes, and meet our record-keeping
              obligations. You may request removal at any time (see section 7).
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">6. Cookies &amp; site data</h2>
            <p>
              We use only the technical browser storage necessary to make the site work (for example,
              keeping track of your shopping cart while you browse). We do not use advertising or
              tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">7. Your rights</h2>
            <p>
              You may contact us at any time to:
            </p>
            <ul className="mt-3 list-disc pl-6 space-y-1.5">
              <li>Ask what information we hold about you</li>
              <li>Request that we correct inaccurate information</li>
              <li>Request that we delete your information once the transaction is complete</li>
              <li>Withdraw your consent to further communication</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">8. Consent</h2>
            <p>
              By submitting a reservation on this website, you confirm that you have read this
              Privacy Policy and consent to us storing and using your name, email address, and phone
              number for the purposes described above.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">9. Changes to this policy</h2>
            <p>
              We may update this Privacy Policy from time to time. The version published on this
              page is the version currently in force.
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
