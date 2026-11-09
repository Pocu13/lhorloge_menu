import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Camera, Eye, EyeOff, FileUp, LogOut, Pencil, Plus, Trash2 } from "lucide-react";
import { MenuImporter } from "../lib/menu-importer";
import { supabase } from "@/integrations/supabase/client";
import { allDishesQuery, type DishRow } from "@/lib/menu-api";
import { allergenLabels, categories, dietLabels, formatPrice, type AllergenId, type DietId } from "@/lib/menu-data";
import { ClockMark } from "@/components/menu-ui";
import { cn } from "@/lib/utils";

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
      // Verifica della sessione locale salvata nel browser per un accesso immediato e affidabile
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session || !sessionData.session.user) {
        setState("out");
        return;
      }
      setState("in");
    };
    
    check();
    
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        setState("in");
      } else if (event === "SIGNED_OUT") {
        setState("out");
      }
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
    const email = user.trim().toLowerCase();
    if (!email || !email.includes("@")) { 
      toast.error("Inserisci un'email valida"); 
      return; 
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    setBusy(false);
    
    if (error) {
      console.error("Errore login:", error.message);
      toast.error("Credenziali non valide: " + error.message);
    } else {
      toast.success("Accesso effettuato con successo!");
      window.location.reload();
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto mt-16 max-w-sm space-y-4 rounded-lg border border-border/40 bg-card p-6">
      <h1 className="font-display text-2xl text-title">Accesso admin</h1>
      <label className="block text-sm text-muted-foreground">
        Email
        <input className={cn(input, "mt-1")} value={user} onChange={(e) => setUser(e.target.value)} autoComplete="email" placeholder="admin@lhorloge.it" />
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
                    {formatPrice(Number(r.price), "it")}
                    {!r.visible && " · Nascosto"}
                    {!r.allergens_checked && <span className="text-destructive"> · Allergeni da verificare</span>}
                  </p>
                </div>
                <button aria-label={r.visible ? "Nascondi dal menu" : "Mostra nel menu"} title={r.visible ? "Nascondi dal menu" : "Mostra nel menu"} onClick={() => toggle(r)} className="grid h-10 w-10 place-items-center rounded-full border border-border/60 hover:text-sage">
                  {r.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button aria-label="Modifica" onClick={() => setEdit({ row: r, isNew: false })} className="grid h-10 w-10 place-items-center rounded-full border border-border/60 hover:text-sage">
                  <Pencil className="h-4 w-4" />
                </button>
                <button aria-label="Elimina" onClick={() => remove(r)} className="grid h-10 w-10 place-items-center rounded-full border border-border/60 text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function DishForm({ initial, isNew, onDone }: { initial: DishRow; isNew: boolean; onDone: () => void }) {
  const [r, setR] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const set = <K extends keyof DishRow>(k: K, v: DishRow[K]) => setR((p) => ({ ...p, [k]: v }));
  const list = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);
  const opt = (v: string) => (v.trim() ? v : null);

  const upload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("dish-photos").upload(path, file, { contentType: file.type });
    if (error) { 
      setUploading(false); 
      toast.error(error.message); 
      return; 
    }
    const { data, error: e2 } = await supabase.storage.from("dish-photos").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    setUploading(false);
    if (e2 || !data) { 
      toast.error(e2?.message ?? "Errore"); 
      return; 
    }
    set("image", data.signedUrl);
    toast.success("Foto caricata — ricorda di salvare");
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!r.name_it.trim()) { 
      toast.error("Inserisci il nome in italiano"); 
      return; 
    }
    setBusy(true);
    const { updated_at: _u, ...payload } = { 
      ...r, 
      id: isNew ? slug(r.name_it) || crypto.randomUUID() : r.id,
      image: r.image 
    };
    const { error } = isNew
      ? await supabase.from("dishes").insert(payload)
      : await supabase.from("dishes").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", r.id);
    setBusy(false);
    if (error) { 
      toast.error(error.message); 
      return; 
    }
    toast.success("Piatto salvato");
    onDone();
  };

  const pair = (label: string, it: keyof DishRow, en: keyof DishRow, area = false) => (
    <div className="grid gap-3 sm:grid-cols-2">
      {([["IT", it], ["EN", en]] as const).map(([l, k]) => (
        <label key={l} className="block text-xs text-muted-foreground">
          {label} ({l})
          {area ? (
            <textarea rows={3} className={cn(input, "mt-1")} value={String(r[k] ?? "")} onChange={(e) => set(k, e.target.value as never)} />
          ) : (
            <input className={cn(input, "mt-1")} value={String(r[k] ?? "")} onChange={(e) => {
              const val = e.target.value;
              const formattedVal = k.startsWith("signature") || k.startsWith("sommelier") ? opt(val) : val;
              set(k, formattedVal as never);
            }} />
          )}
        </label>
      ))}
    </div>
  );

  return (
    <form onSubmit={save} className="mx-auto max-w-3xl space-y-5 px-5 py-8">
      <h1 className="font-display text-2xl text-title">{isNew ? "Nuovo piatto" : "Modifica piatto"}</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-xs text-muted-foreground">
          Categoria
          <select className={cn(input, "mt-1")} value={r.category} onChange={(e) => set("category", e.target.value)}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.label.it}</option>)}
          </select>
        </label>
        <label className="block text-xs text-muted-foreground">
          Prezzo (€)
          <input type="number" step="0.5" min="0" className={cn(input, "mt-1")} value={r.price} onChange={(e) => set("price", Number(e.target.value))} />
        </label>
        <label className="block text-xs text-muted-foreground">
          Ordine
          <input type="number" className={cn(input, "mt-1")} value={r.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))} />
        </label>
      </div>
      {pair("Nome", "name_it", "name_en")}
      {pair("Etichetta", "tag_it", "tag_en")}
      {pair("Descrizione", "description_it", "description_en", true)}
      <div className="grid gap-3 sm:grid-cols-2">
        {(["it", "en"] as const).map((l) => (
          <label key={l} className="block text-xs text-muted-foreground">
            Ingredienti ({l.toUpperCase()}, separati da virgola)
            <input className={cn(input, "mt-1")} defaultValue={r[`ingredients_${l}`]?.join(", ") ?? ""} onBlur={(e) => set(`ingredients_${l}` as keyof DishRow, list(e.target.value) as never)} />
          </label>
        ))}
      </div>
      <fieldset>
        <legend className="mb-2 text-xs text-muted-foreground">Allergeni</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(allergenLabels) as AllergenId[]).map((a) => {
            const on = r.allergens?.includes(a);
            return (
              <button type="button" key={a} onClick={() => set("allergens", on ? r.allergens.filter((x: string) => x !== a) : [...(r.allergens || []), a])}
                className={cn("min-h-9 rounded-full border px-3 text-xs", on ? "border-destructive bg-destructive/15 text-destructive" : "border-border/60 text-muted-foreground")}>
                {allergenLabels[a].it}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(dietLabels) as DietId[]).map((k) => (
            <button type="button" key={k} onClick={() => set(k, !r[k])}
              className={cn("min-h-9 rounded-full border px-3 text-xs", r[k] ? "border-sage bg-sage/15 text-sage" : "border-border/60 text-muted-foreground")}>
              {dietLabels[k].it}
            </button>
          ))}
        </div>
        <label className={cn("mt-3 flex items-center gap-2 rounded-md border p-3 text-sm", r.allergens_checked ? "border-border/40 text-title" : "border-destructive/60 text-destructive")}>
          <input type="checkbox" checked={r.allergens_checked} onChange={(e) => set("allergens_checked", e.target.checked)} className="h-5 w-5 accent-sage" />
          Ho verificato gli allergeni di questo piatto (necessario per pubblicarlo)
        </label>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded bg-surface-low">
          {r.image && <img src={r.image} alt="" className="h-full w-full object-cover" />}
        </div>
        <label className={cn("flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-border/60 px-5 text-sm text-title", uploading && "opacity-60")}>
          <Camera className="h-4 w-4" /> {uploading ? "Caricamento…" : "Carica foto"}
          <input type="file" accept="image/*" className="sr-only" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
        </label>
        {r.image && <button type="button" onClick={() => set("image", null)} className="text-xs text-destructive">Rimuovi foto</button>}
      </div>
      <label className="flex items-center gap-2 text-sm text-title">
        <input type="checkbox" checked={r.visible} onChange={(e) => set("visible", e.target.checked)} className="h-5 w-5 accent-sage" />
        Visibile nel menu
      </label>
      <label className="block text-xs text-muted-foreground">
        Oppure indirizzo immagine (URL)
        <input className={cn(input, "mt-1")} value={r.image ?? ""} onChange={(e) => set("image", opt(e.target.value))} placeholder="https://…" />
      </label>
      <p className="border-t border-border/30 pt-4 text-xs uppercase tracking-widest text-muted-foreground">Abbinamento del sommelier (facoltativo)</p>
      {pair("Vino / cocktail consigliato", "sommelier_wine_it", "sommelier_wine_en")}
      {pair("Perché questo abbinamento", "sommelier_note_it", "sommelier_note_en")}
      <p className="border-t border-border/30 pt-4 text-xs uppercase tracking-widest text-muted-foreground">Nota dello chef (facoltativo)</p>
      {pair("Nota", "signature_note_it", "signature_note_en")}
      <div className="flex gap-3 pt-2">
        <button disabled={busy} className="min-h-11 rounded-full bg-sage px-6 text-sm font-semibold text-sage-foreground disabled:opacity-60">Salva</button>
        <button type="button" onClick={onDone} className="min-h-11 rounded-full border border-border/60 px-6 text-sm text-title">Annulla</button>
      </div>
    </form>
  );
}
