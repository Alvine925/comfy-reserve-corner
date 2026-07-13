import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import {
  adminListProducts,
  adminListReservations,
  bulkImportProducts,
  checkIsAdmin,
  createProduct,
  deleteProduct,
  updateProduct,
  updateReservationStatus,
} from "@/lib/products.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/alvookado")({
  head: () => ({ meta: [{ title: "Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminPage,
});

function AdminPage() {
  const [session, setSession] = useState<{ loaded: boolean; userId: string | null }>({
    loaded: false,
    userId: null,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession({ loaded: true, userId: data.session?.user.id ?? null });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession({ loaded: true, userId: s?.user.id ?? null });
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!session.loaded) return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  if (!session.userId) return <LoginForm />;
  return <AdminGuard />;
}

function LoginForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/alvookado` },
        });
        if (error) throw error;
        toast.success("Account created. You'll need admin role granted to access the dashboard.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <div className="mx-auto max-w-sm px-4 py-16">
        <h1 className="text-2xl font-bold">Admin {mode === "login" ? "sign in" : "sign up"}</h1>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>
        <button
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-4 w-full text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}

function AdminGuard() {
  const check = useServerFn(checkIsAdmin);
  const { data, isLoading, error } = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => check(),
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Checking access…</div>;
  if (error || !data?.isAdmin) return <NotAdmin />;
  return <Dashboard />;
}

function NotAdmin() {
  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Access denied</h1>
        <p className="mt-2 text-muted-foreground">
          Your account isn't an admin. Ask the owner to grant admin role in Supabase, then refresh.
        </p>
        <Button
          className="mt-6"
          variant="outline"
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.reload();
          }}
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}

function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold">Admin dashboard</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.reload();
            }}
          >
            Sign out
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Tabs defaultValue="products">
          <TabsList>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="reservations">Reservations</TabsTrigger>
            <TabsTrigger value="import">Bulk import</TabsTrigger>
          </TabsList>
          <TabsContent value="products" className="mt-6">
            <ProductsTab />
          </TabsContent>
          <TabsContent value="reservations" className="mt-6">
            <ReservationsTab />
          </TabsContent>
          <TabsContent value="import" className="mt-6">
            <ImportTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

type ProductRow = Awaited<ReturnType<typeof adminListProducts>>[number];

function ProductsTab() {
  const listFn = useServerFn(adminListProducts);
  const delFn = useServerFn(deleteProduct);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-products"], queryFn: () => listFn() });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <ProductDialog onSaved={() => qc.invalidateQueries({ queryKey: ["admin-products"] })}>
          <Button>+ Add product</Button>
        </ProductDialog>
      </div>
      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Offer price</th>
                <th className="p-3 text-left">Acq. price</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((p: ProductRow) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3">{p.name}</td>
                  <td className="p-3">${Number(p.offer_price).toFixed(2)}</td>
                  <td className="p-3">
                    {p.acquisition_price != null ? `$${Number(p.acquisition_price).toFixed(2)}` : "—"}
                  </td>
                  <td className="p-3">
                    {!p.is_active ? "Inactive" : p.is_reserved ? "Reserved" : "Available"}
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex gap-2">
                      <ProductDialog
                        product={p}
                        onSaved={() => qc.invalidateQueries({ queryKey: ["admin-products"] })}
                      >
                        <Button variant="outline" size="sm">Edit</Button>
                      </ProductDialog>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (!confirm(`Delete "${p.name}"?`)) return;
                          try {
                            await delFn({ data: { id: p.id } });
                            toast.success("Deleted");
                            qc.invalidateQueries({ queryKey: ["admin-products"] });
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "Failed");
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {(data ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">No products yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ProductDialog({
  children,
  product,
  onSaved,
}: {
  children: React.ReactNode;
  product?: ProductRow;
  onSaved: () => void;
}) {
  const createFn = useServerFn(createProduct);
  const updateFn = useServerFn(updateProduct);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: product?.name ?? "",
    short_description: product?.short_description ?? "",
    description: product?.description ?? "",
    acquisition_price: product?.acquisition_price?.toString() ?? "",
    offer_price: product?.offer_price?.toString() ?? "",
    image_url: product?.image_url ?? "",
    is_active: product?.is_active ?? true,
    is_reserved: product?.is_reserved ?? false,
  });
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        name: form.name,
        short_description: form.short_description || null,
        description: form.description || null,
        acquisition_price: form.acquisition_price ? Number(form.acquisition_price) : null,
        offer_price: Number(form.offer_price),
        image_url: form.image_url || null,
        is_active: form.is_active,
        is_reserved: form.is_reserved,
      };
      if (product) {
        await updateFn({ data: { id: product.id, patch: payload } });
        toast.success("Updated");
      } else {
        await createFn({ data: payload });
        toast.success("Created");
      }
      setOpen(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Edit product" : "Add product"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Short description</Label>
            <Input value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Acquisition price</Label>
              <Input type="number" step="0.01" value={form.acquisition_price} onChange={(e) => setForm({ ...form, acquisition_price: e.target.value })} />
            </div>
            <div>
              <Label>Offer price *</Label>
              <Input type="number" step="0.01" required value={form.offer_price} onChange={(e) => setForm({ ...form, offer_price: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Image URL</Label>
            <Input type="url" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://…" />
          </div>
          <div className="flex gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Active
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={form.is_reserved} onChange={(e) => setForm({ ...form, is_reserved: e.target.checked })} />
              Reserved
            </label>
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Saving…" : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReservationsTab() {
  const listFn = useServerFn(adminListReservations);
  const updateFn = useServerFn(updateReservationStatus);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-reservations"],
    queryFn: () => listFn(),
  });

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="p-3 text-left">Date</th>
            <th className="p-3 text-left">Product</th>
            <th className="p-3 text-left">Customer</th>
            <th className="p-3 text-left">Contact</th>
            <th className="p-3 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {(data ?? []).map((r: any) => (
            <tr key={r.id} className="border-t align-top">
              <td className="p-3 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
              <td className="p-3">{r.products?.name ?? "—"}</td>
              <td className="p-3">{r.customer_name}</td>
              <td className="p-3">
                <div>{r.customer_email}</div>
                <div className="text-muted-foreground">{r.customer_phone}</div>
                {r.notes && <div className="mt-1 text-xs text-muted-foreground">{r.notes}</div>}
              </td>
              <td className="p-3">
                <Select
                  value={r.status}
                  onValueChange={async (v) => {
                    try {
                      await updateFn({ data: { id: r.id, status: v as any } });
                      qc.invalidateQueries({ queryKey: ["admin-reservations"] });
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Failed");
                    }
                  }}
                >
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </td>
            </tr>
          ))}
          {(data ?? []).length === 0 && (
            <tr>
              <td colSpan={5} className="p-6 text-center text-muted-foreground">No reservations yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ImportTab() {
  const importFn = useServerFn(bulkImportProducts);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<any[] | null>(null);

  async function parseFile(file: File) {
    const name = file.name.toLowerCase();
    if (name.endsWith(".csv")) {
      const text = await file.text();
      const res = Papa.parse(text, { header: true, skipEmptyLines: true });
      return res.data as any[];
    }
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet) as any[];
  }

  function normalize(rows: any[]) {
    return rows
      .map((r) => {
        const name = String(r.name ?? r.Name ?? "").trim();
        const offer = Number(r.offer_price ?? r["offer price"] ?? r.price ?? 0);
        if (!name || !offer) return null;
        return {
          name,
          short_description: str(r.short_description ?? r["short description"]),
          description: str(r.description ?? r.Description),
          acquisition_price: num(r.acquisition_price ?? r["acquisition price"]),
          offer_price: offer,
          image_url: str(r.image_url ?? r["image url"] ?? r.image),
          is_active: true,
        };
      })
      .filter(Boolean) as any[];
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await parseFile(file);
      const cleaned = normalize(rows);
      if (cleaned.length === 0) {
        toast.error("No valid rows found. Required columns: name, offer_price");
        return;
      }
      setPreview(cleaned);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Parse failed");
    }
  }

  async function confirmImport() {
    if (!preview) return;
    setBusy(true);
    try {
      const res = await importFn({ data: { rows: preview } });
      toast.success(`Imported ${res.inserted} products`);
      setPreview(null);
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-6">
        <h2 className="font-semibold">Bulk import from CSV or Excel</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Required columns: <code>name</code>, <code>offer_price</code>. Optional:{" "}
          <code>short_description</code>, <code>description</code>, <code>acquisition_price</code>,{" "}
          <code>image_url</code>.
        </p>
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={onFile}
          className="mt-4 block w-full text-sm"
        />
      </div>

      {preview && (
        <div className="rounded-lg border">
          <div className="flex items-center justify-between border-b p-4">
            <div className="text-sm">Ready to import <strong>{preview.length}</strong> products</div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPreview(null)}>Cancel</Button>
              <Button onClick={confirmImport} disabled={busy}>
                {busy ? "Importing…" : "Confirm import"}
              </Button>
            </div>
          </div>
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 text-left">Name</th>
                  <th className="p-2 text-left">Offer price</th>
                  <th className="p-2 text-left">Image</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 50).map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{r.name}</td>
                    <td className="p-2">${Number(r.offer_price).toFixed(2)}</td>
                    <td className="p-2 truncate max-w-xs">{r.image_url || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 50 && (
              <div className="p-2 text-center text-xs text-muted-foreground">
                …and {preview.length - 50} more
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}
function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}
