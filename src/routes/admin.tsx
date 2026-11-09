import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Camera, Eye, EyeOff, FileUp, LogOut, Pencil, Plus, Trash2 } from "lucide-react";
import { MenuImporter } from "../components/menu-importer";
import { supabase } from "@/integrations/supabase/client";
import { allDishesQuery, type DishRow } from "@/lib/menu-api";
import { allergenLabels, categories, dietLabels, formatPrice, type AllergenId, type DietId } from "@/lib/menu-data";
import { ClockMark } from "@/components/menu-ui";
import { cn } from "@/lib/utils";

const ADMIN_EMAIL = "admin@admin.it";
const toAuthPassword = (p: string) => `lh-admin-${p}`;

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Area Admin — L'Horloge" },
      { name: "description", content: "Gestione dei piatti del menu di L'Horloge." },
      { property: "og:title", content: "Area Admin — L'Horloge" },
      { property: "og:description", content: "Gestione dei piatti del menu." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [state, setState] = useState<"loading" | "out" | "in" | "denied">("loading");

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { 
        setState("out"); 
        return; 
      }
      const { data: ok } = await supabase.rpc("has_role", { _user_id: data.user.id, _role: "admin" });
      setState(ok ? "in" : "denied");
    };
    check();
    const { data: sub } = supabase.auth.onAuthStateChange((e) => {
      if (e === "SIGNED_IN" || e === "SIGNED_OUT") check();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/30">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <Link to="/" className="group flex items-center gap-3">
            <ClockMark />
            <span className="font-display text-xl text-title">Admin</span>
          </Link>
          {state === "in" && (
            <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-title">
              <LogOut className="h-4 w-4" /> Esci
            </button>
          )}
        </div>
      </header>
      {state === "loading" && <p className="p-10 text-center text-muted-foreground">…</p>}
      {(state === "out" || state === "denied") && <Login />}
      {state === "in" && <Editor />}
    </div>
  );
}

const input = "w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm text-foreground focus:border-sage focus:outline-none";

function Login() {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const u = user.trim().toLowerCase();
    const email = u === "admin" ? ADMIN_EMAIL : u;
    if (!email.includes("@")) { 
      toast.error("Credenziali non valide"); 
      return; 
    }
    setBusy(true);
    let { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) {
      const res = await supabase.auth.signInWithPassword({ email, password: toAuthPassword(pass) });
      error = res.error;
    }
    setBusy(false);
    if (error) toast.error("Credenziali non valide");
  };

  return (
    <form onSubmit={submit} className="mx-auto mt-16 max-w-sm space-y-4 rounded-lg border border-border/40 bg-card p-6">
      <h1 className="font-display text-2xl text-title">Accesso admin</h1>
      <label className="block text-sm text-muted-foreground">
        Utente
        <input className={cn(input, "mt-1")} value={user} onChange={(e) => setUser(e.target.value)} autoComplete="username" />
      </label>
      <label className="block text-sm text-muted-foreground">
        Password
        <input type="password" className={cn(input, "mt-1")} value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="current-password" />
      </label>
      <button disabled={busy} className="min-h-11 w-full rounded-full bg-sage text-sm font-semibold text-sage-foreground disabled:opacity-60">Entra</button>
    </form>
  );
}

const empty: DishRow = {
  id: "", 
  category: "antipasti", 
  name_it: "", 
  name_en: "", 
  tag_it: "", 
  tag_en: "", 
  description_it: "", 
  description_en: "",
  ingredients_it: [], 
  ingredients_en: [], 
  allergens: [], 
  price: 0, 
  image: null, 
  signature_note_it: null, 
  signature_note_en: null,
  signature_pairing_it: null, 
  signature_pairing_en: null, 
  sort_order: 0, 
  updated_at: "", 
  visible: true,
  vegetarian: false, 
  vegan: false, 
  gluten_free: false, 
  allergens_checked: true,
  is_vegetarian: false, 
  is_vegan: false, 
  is_gluten_free: false,
  sommelier_wine_it: null, 
  sommelier_wine_en: null, 
  sommelier_note_it: null, 
  sommelier_note_en: null,
};

function Editor() {
  const qc = useQueryClient();
  const { data = [] } = useQuery(allDishesQuery);
  const [edit, setEdit] = useState<{ row: DishRow; isNew: boolean } | null>(null);
  const [importing, setImporting] = useState(false);

  const remove = async (r: DishRow) => {
    if (!confirm(`Eliminare "${r.name_it}"?`)) return;
    const { error } = await supabase.from("dishes").delete().eq("id", r.id);
    if (error) { 
      toast.error(error.message); 
      return; 
    }
    toast.success("Piatto eliminato");
    qc.invalidateQueries({ queryKey: ["dishes"] });
  };

  const toggle = async (r: DishRow) => {
    const { error } = await supabase.from("dishes").update({ visible: !r.visible }).eq("id", r.id);
    if (error) { 
      toast.error(error.message); 
      return; 
    }
    toast.success(r.visible ? "Piatto nascosto dal menu" : "Piatto di nuovo visibile");
    qc.invalidateQueries({ queryKey: ["dishes"] });
  };

  const toCheck = data.filter((r) => !r.allergens_checked).length;
  
  if (importing) {
    return (
      <MenuImporter 
        nextOrder={(data.at(-1)?.sort_order ?? 0) + 1} 
        onClose={() => setImporting(false)} 
        onDone={() => { 
          setImporting(false); 
          qc.invalidateQueries({ queryKey: ["dishes"] }); 
        }} 
      />
    );
  }

  if (edit) {
    return (
      <DishForm 
        initial={edit.row} 
        isNew={edit.isNew} 
        onDone={() => { 
          setEdit(null); 
          qc.invalidateQueries({ queryKey: ["dishes"] }); 
        }} 
      />
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-title">Piatti ({data.length})</h1>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setImporting(true)} className="flex min-h-11 items-center gap-2 rounded-full border border-border/60 px-5 text-sm text-title">
            <FileUp className="h-4 w-4" /> Importa da PDF
          </button>
          <button onClick={() => setEdit({ row: { ...empty, sort_order: (data.at(-1)?.sort_order ?? 0) + 1 }, isNew: true })} className="flex min-h-11 items-center gap-2 rounded-full bg-sage px-5 text-sm font-semibold text-sage-foreground">
            <Plus className="h-4 w-4" /> Nuovo piatto
          </button>
        </div>
      </div>
      {toCheck > 0 && (
        <p className="mb-6 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {toCheck} piatti con allergeni da verificare: restano nascosti finché non li confermi.
        </p>
      )}
      {categories.map((c) => (
        <section key={c.id} className="mb-8">
          <h2 className="mb-3 font-display text-lg italic text-title">{c.label.it}</h2>
          <ul className="divide-y divide-border/30 rounded-lg border border-border/30 bg-card/60">
            {data.filter((r) => r.category === c.id).map((r) => (
              <li key={r.id} className={cn("flex items-center gap-3 p-3", !r.visible && "opacity-50")}>
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-surface-low">
                  {r.image && <img src={r.image} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-title">{r.name_it}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatPrice(
