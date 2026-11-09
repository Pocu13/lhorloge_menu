import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FileUp, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { extractMenu, type ImportedDish } from "./menu-import.functions";
import { allergenLabels, categories, dietLabels, type AllergenId, type DietId } from "@/lib/menu-data";
import { cn } from "@/lib/utils";

const input = "w-full rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm text-foreground focus:border-sage focus:outline-none";
const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

type Row = ImportedDish & { keep: boolean };

const toBase64 = (f: File) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result).split(",")[1] ?? "");
  r.onerror = rej;
  r.readAsDataURL(f);
});

export function MenuImporter({ nextOrder, onClose, onDone }: { nextOrder: number; onClose: () => void; onDone: () => void }) {
  const run = useServerFn(extractMenu);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [saving, setSaving] = useState(false);

  const pick = async (f: File) => {
    setBusy(true);
    try {
      const res = await run({ data: { fileName: f.name, mimeType: f.type || "application/pdf", base64: await toBase64(f) } });
      if (res.error) toast.error(res.error);
      else if (!res.dishes.length) toast.error("Nessun piatto trovato nel file");
      else setRows(res.dishes.map((d) => ({ ...d, keep: true })));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    } finally { setBusy(false); }
  };

  const upd = (i: number, p: Partial<Row>) => setRows((rs) => rs && rs.map((r, j) => (j === i ? { ...r, ...p } : r)));

  const save = async () => {
    if (!rows) return;
    const chosen = rows.filter((r) => r.keep && r.name_it.trim());
    if (!chosen.length) { toast.error("Nessun piatto selezionato"); return; }
    
    setSaving(true);
    
    const payload = chosen.map(({ keep: _k, ...d }, i) => ({
      id: `${slug(d.name_it)}-${crypto.randomUUID().slice(0, 4)}`,
      category: d.category,
      name_it: d.name_it || "",
      name_en: d.name_en || "",
      tag_it: d.tag_it || "",
      tag_en: d.tag_en || "",
      description_it: d.description_it || "",
      description_en: d.description_en || "",
      ingredients_it: d.ingredients_it || [],
      ingredients_en: d.ingredients_en || [],
      allergens: d.allergens || [],
      price: Number(d.price) || 0,
      image: d.image || null,
      is_vegetarian: Boolean(d.is_vegetarian),
      is_vegan: Boolean(d.is_vegan),
      is_gluten_free: Boolean(d.is_gluten_free),
      sort_order: nextOrder + i,
      visible: false,
      allergens_checked: false
    }));

    const { error } = await supabase.from("dishes").insert(payload);
    setSaving(false);
    
    if (error) { toast.error(error.message); return; }
    toast.success(`${payload.length} piatti importati — nascosti finché non verifichi gli allergeni`);
    onDone();
  };

  return (
    <main className="mx-auto max-w-5xl px-5 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl text-title">Importa menu da PDF</h1>
        <button onClick={onClose} aria-label="Chiudi" className="grid h-10 w-10 place-items-center rounded-full border border-border/60"><X className="h-4 w-4" /></button>
      </div>

      {!rows && (
        <label className={cn("flex min-h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 bg-card/60 p-8 text-center", busy && "pointer-events-none opacity-70")}>
          {busy ? <Loader2 className="h-8 w-8 animate-spin text-sage" /> : <FileUp className="h-8 w-8 text-sage" />}
          <span className="text-title">{busy ? "Sto leggendo il menu… (può richiedere fino a un minuto)" : "Carica il PDF o una foto del menu"}</span>
          <span className="text-xs text-muted-foreground">Verranno estratti nome, descrizione, prezzo e allergeni. Potrai controllare tutto prima di salvare.</span>
          <input type="file" accept="application/pdf,image/*" className="sr-only" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = ""; }} />
        </label>
      )}

      {rows && (
        <>
          <p className="mb-4 text-sm text-muted-foreground">Trovati {rows.length} piatti. Controlla e correggi, poi importa. I piatti resteranno nascosti dal menu finché non confermi gli allergeni di ciascuno.</p>
          <ul className="space-y-4">
            {rows.map((r, i) => (
              <li key={i} className={cn("space-y-3 rounded-lg border border-border/40 bg-card/60 p-4", !r.keep && "opacity-50")}>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-title"><input type="checkbox" checked={r.keep} onChange={(e) => upd(i, { keep: e.target.checked })} className="h-5 w-5 accent-sage" /> Importa</label>
                  <select className={cn(input, "w-auto")} value={r.category} onChange={(e) => upd(i, { category: e.target.value })}>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.label.it}</option>)}
                  </select>
                  <label className="flex items-center gap-1 text-xs text-muted-foreground">€<input type="number" step="0.5" className={cn(input, "w-24")} value={r.price} onChange={(e) => upd(i, { price: Number(e.target.value) })} /></label>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input className={input} value={r.name_it} onChange={(e) => upd(i, { name_it: e.target.value })} placeholder="Nome IT" />
                  <input className={input} value={r.name_en} onChange={(e) => upd(i, { name_en: e.target.value })} placeholder="Name EN" />
                  <textarea rows={2} className={input} value={r.description_it} onChange={(e) => upd(i, { description_it: e.target.value })} placeholder="Descrizione IT" />
                  <textarea rows={2} className={input} value={r.description_en} onChange={(e) => upd(i, { description_en: e.target.value })} placeholder="Description EN" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(allergenLabels) as AllergenId[]).map((a) => {
                    const on = r.allergens?.includes(a);
                    return <button type="button" key={a} onClick={() => upd(i, { allergens: on ? r.allergens.filter((x) => x !== a) : [...(r.allergens || []), a] })}
                      className={cn("min-h-8 rounded-full border px-2.5 text-xs", on ? "border-destructive bg-destructive/15 text-destructive" : "border-border/60 text-muted-foreground")}>{allergenLabels[a].it}</button>;
                  })}
                  {(Object.keys(dietLabels) as DietId[]).map((k) => (
                    <button type="button" key={k} onClick={() => upd(i, { [k]: !r[k] } as Partial<Row>)}
                      className={cn("min-h-8 rounded-full border px-2.5 text-xs", r[k] ? "border-sage bg-sage/15 text-sage" : "border-border/60 text-muted-foreground")}>{dietLabels[k].it}</button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <div className="sticky bottom-0 mt-6 flex gap-3 border-t border-border/30 bg-background/95 py-4 backdrop-blur">
            <button onClick={save} disabled={saving} className="min-h-11 rounded-full bg-sage px-6 text-sm font-semibold text-sage-foreground disabled:opacity-60">
              {saving ? "Importazione…" : `Conferma e importa (${rows.filter((r) => r.keep).length})`}
            </button>
            <button onClick={() => setRows(null)} className="min-h-11 rounded-full border border-border/60 px-6 text-sm text-title">Altro file</button>
          </div>
        </>
      )}
    </main>
  );
}
