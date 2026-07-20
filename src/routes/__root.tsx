import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { CartProvider } from "@/lib/cart-context";
import { CartDrawer, CartButton } from "@/components/CartDrawer";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Furniture for Sale — Browse & Reserve" },
      { name: "description", content: "Browse quality pre-owned furniture and reserve your favorite pieces online." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Furniture for Sale — Browse & Reserve" },
      { property: "og:description", content: "Browse quality pre-owned furniture and reserve your favorite pieces online." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Furniture for Sale — Browse & Reserve" },
      { name: "twitter:description", content: "Browse quality pre-owned furniture and reserve your favorite pieces online." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5f86df09-28a5-42fb-bbc1-4cbc7a9cc0e0/id-preview-ca274abd--0bf54da4-04a7-456c-8a1f-8d5a1776a9d3.lovable.app-1783925750604.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5f86df09-28a5-42fb-bbc1-4cbc7a9cc0e0/id-preview-ca274abd--0bf54da4-04a7-456c-8a1f-8d5a1776a9d3.lovable.app-1783925750604.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <div className="flex min-h-screen flex-col">
          {/* Top bar */}
          <div className="w-full bg-foreground text-background">
            <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-1.5 text-[11px] font-medium tracking-wide">
              <span className="opacity-70">Powered by</span>
              <a
                href="https://myjoyfullday.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline-offset-4 hover:underline"
              >
                My Joyfullday →
              </a>
            </div>
          </div>

          <div className="flex-1">
            <Outlet />
          </div>
          <footer className="border-t border-border py-8 text-center">
            <nav className="mb-5 flex items-center justify-center gap-5 text-xs font-medium text-muted-foreground">
              <Link to="/" className="hover:text-foreground transition-colors">Browse</Link>
              <span className="text-muted-foreground/30">·</span>
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms &amp; Conditions</Link>
              <span className="text-muted-foreground/30">·</span>
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            </nav>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">
              Powered by
            </p>
            <a
              href="https://myjoyfullday.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-full bg-foreground px-4 py-1.5 text-[11px] font-bold tracking-wide text-background transition-opacity hover:opacity-75"
            >
              My Joyfullday
            </a>
            <p className="mt-2 text-[10px] text-muted-foreground/50">
              myjoyfullday.com
            </p>
          </footer>
        </div>
        <CartDrawer />
        <CartButton />
        <Toaster />
      </CartProvider>
    </QueryClientProvider>
  );
}
