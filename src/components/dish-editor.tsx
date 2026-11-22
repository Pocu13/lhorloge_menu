
import { useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronDown,
  Crop,
  Eye,
  Plus,
  SlidersHorizontal,
  Trash2,
  X,
  AlertTriangle,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { DishRow } from "@/lib/menu-api";
import {
  allergenLabels,
  categories,
  dietLabels,
  type AllergenId,
  type DietId,
} from "@/lib/menu-data";

type Props = {
  initial: DishRow;
  isNew: boolean;
  onDone: () => void;
  onDelete?: () => void;
};

const allergens: {
  id: AllergenId;
  name: string;
  icon: string;
}[] = [
  { id: "glutine", name: "Cereali con Glutine", icon: "🌾" },
  { id: "crostacei", name: "Crostacei", icon: "🦐" },
  { id: "uova", name: "Uova", icon: "🥚" },
  { id: "pesce", name: "Pesce", icon: "🐟" },
  { id: "arachidi", name: "Arachidi", icon: "🥜" },
  { id: "soia", name: "Soia", icon: "🌱" },
  { id: "latte", name: "Latte e Derivati", icon: "💧" },
  { id: "fruttaGuscio", name: "Frutta a Guscio", icon: "🌰" },
  { id: "sedano", name: "Sedano", icon: "🌿" },
  { id: "senape", name: "Senape", icon: "🍽️" },
  { id: "sesamo", name: "Semi di Sesamo", icon: "⚪" },
  { id: "solfiti", name: "Anidride Solforosa e Solfiti", icon: "🍷" },
  { id: "lupini", name: "Lupini", icon: "🌼" },
  { id: "molluschi", name: "Molluschi", icon: "🦪" },
];

const ingredientCategories = [
  "Salumi & Carni",
  "Latticini & Formaggi",
  "Conserve & Mieli",
  "Spezie & Condimenti",
  "Vegetali & Frutta",
];

const certifications = [
  "Nessuna",
  "Presidio Slow Food",
  "DOP",
  "IGP",
  "Bio Etna",
  "Tradizionale",
];

const input =
  "w-full rounded-xl border border-white/10 bg-[#152222] px-3.5 py-3 text-sm text-[#EEEEEE] outline-none transition placeholder:text-[#777F7D] focus:border-[#D8E9AC] focus:ring-1 focus:ring-[#D8E9AC]";

const label =
  "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#B5CBC9]";

const card = "rounded-xl bg-[#111E1E] p-4 shadow-sm";

const buttonPrimary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#D8E9AC] px-5 text-xs font-bold uppercase tracking-wider text-[#0B1818] transition hover:bg-[#E5F0C8] disabled:opacity-50";

const buttonSecondary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#20302F] px-4 text-xs font-semibold text-[#EEEEEE] transition hover:bg-[#2A3D3B]";

function imageUrl(value: string | null) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return supabase.storage.from("dish-photos").getPublicUrl(value).data.publicUrl;
}

export function DishEditor({
  initial,
  isNew,
  onDone,
  onDelete,
}: Props) {
  const [r, setR] = useState<DishRow>(initial);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [ingredientModal, setIngredientModal] = useState(false);
  const [allergenModal, setAllergenModal] = useState(false);
  const [previewModal, setPreviewModal] = useState(false);

  const [ingredientName, setIngredientName] = useState("");
  const [ingredientCategory, setIngredientCategory] = useState(ingredientCategories[0]);
  const [ingredientDosage, setIngredientDosage] = useState("");
  const [ingredientOrigin, setIngredientOrigin] = useState("");
  const [ingredientCertification, setIngredientCertification] = useState("Nessuna");
  const [ingredientAllergens, setIngredientAllergens] = useState<AllergenId[]>([]);

  const [tempAllergens, setTempAllergens] = useState<AllergenId[]>(r.allergens as AllergenId[]);
  const photoInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof DishRow>(key: K, value: DishRow[K]) => {
    setR((current) => ({ ...current, [key]: value }));
  };

  const ingredients = r.ingredients_it ?? [];
  const photo = useMemo(() => imageUrl(r.image), [r.image]);

  const toggleAllergen = (id: AllergenId) => {
    setTempAllergens((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const toggleDiet = (id: DietId) => {
    set(id, !r[id]);
  };

  const uploadPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Seleziona un'immagine valida.");
      return;
    }

    setUploading(true);

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${crypto.randomUUID()}.${extension}`;

    const { error } = await supabase.storage
      .from("dish-photos")
      .upload(path, file, {
        contentType: file.type,
        upsert: false,
      });

    setUploading(false);
    event.target.value = "";

    if (error) {
      toast.error(error.message);
      return;
    }

    set("image", path);
    toast.success("Foto caricata. Salva il piatto per confermare.");
  };

  const addIngredient = () => {
    const name = ingredientName.trim();

    if (!name) {
      toast.error("Inserisci il nome dell'ingrediente.");
      return;
    }

    setR((current) => ({
      ...current,
      ingredients_it: [...(current.ingredients_it ?? []), name],
      ingredients_en: [...(current.ingredients_en ?? []), name],
      allergens: Array.from(
        new Set([
          ...(current.allergens ?? []),
          ...ingredientAllergens,
        ]),
      ),
    }));

    setIngredientModal(false);
    setIngredientName("");
    setIngredientDosage("");
    setIngredientOrigin("");
    setIngredientCertification("Nessuna");
    setIngredientAllergens([]);

    toast.success("Ingrediente aggiunto.");
  };

  const removeIngredient = (index: number) => {
    setR((current) => ({
      ...current,
      ingredients_it: (current.ingredients_it ?? []).filter((_, i) => i !== index),
      ingredients_en: (current.ingredients_en ?? []).filter((_, i) => i !== index),
    }));
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!r.name_it.trim()) {
      toast.error("Inserisci il nome del piatto.");
      return;
    }

    setBusy(true);

    const payload = {
      ...r,
      allergens: tempAllergens,
      id: isNew
        ? r.name_it
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "") || crypto.randomUUID()
        : r.id,
      updated_at: new Date().toISOString(),
    };

    const result = isNew
      ? await supabase.from("dishes").insert(payload)
      : await supabase.from("dishes").update(payload).eq("id", r.id);

    setBusy(false);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    toast.success("Piatto salvato correttamente.");
    onDone();
  };

  const pairedFields = (
    title: string,
    italianKey: keyof DishRow,
    englishKey: keyof DishRow,
    multiline = false,
  ) => (
    <div className="grid gap-3 sm:grid-cols-2">
      {[
        { language: "IT", key: italianKey },
        { language: "EN", key: englishKey },
      ].map(({ language, key }) => (
        <label className="block text-[11px] text-[#B5CBC9]" key={language}>
          {title} ({language})
          {multiline ? (
            <textarea
              rows={4}
              className={`${input} mt-1 resize-y leading-relaxed`}
              value={String(r[key] ?? "")}
              onChange={(event) => set(key, event.target.value as never)}
            />
          ) : (
            <input
              className={`${input} mt-1`}
              value={String(r[key] ?? "")}
              onChange={(event) => set(key, event.target.value as never)}
            />
          )}
        </label>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B1818] pb-28 font-body text-[#D7E5E5]">
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/[0.06] bg-[#081616]/90 pt-[env(safe-area-inset-top)] shadow-lg backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-lg items-center gap-3 px-4">
          <button
            type="button"
            onClick={onDone}
            aria-label="Torna indietro"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white transition hover:text-[#D8E9AC]"
          >
            <ArrowLeft size={21} />
          </button>
          <h1 className="min-w-0 flex-1 truncate font-display text-base font-semibold text-white">
            {isNew ? "Nuovo Piatto" : "Modifica Piatto"}
          </h1>
        </div>
      </header>

      <form onSubmit={save} className="mx-auto flex max-w-lg flex-col gap-6 px-3 pb-8 pt-20">
        {/* Fotografia */}
        <section className="rounded-xl bg-[#111E1E] p-3 shadow-md">
          <div className="group relative h-64 overflow-hidden rounded-lg bg-[#20302F]">
            {photo ? (
              <img src={photo} alt={r.name_it} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-[#89918E]">
                <ImageIcon size={32} />
                <span className="text-xs">Nessuna fotografia</span>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-[#081616]/90 via-transparent to-transparent" />

            <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => photoInput.current?.click()}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#20302F]/95 px-2 py-2 text-[11px] font-semibold text-white backdrop-blur"
              >
                <Camera size={15} className="text-[#D8E9AC]" />
                Foto
              </button>
              <button
                type="button"
                onClick={() => setPreviewModal(true)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#D8E9AC] px-2 py-2 text-[11px] font-semibold text-[#0B1818]"
              >
                <Eye size={15} />
                Anteprima
              </button>
              <button
                type="button"
                onClick={() => photoInput.current?.click()}
                aria-label="Sostituisci o ritaglia fotografia"
                className="rounded-lg bg-[#20302F]/95 px-3 py-2 text-white"
              >
                <Crop size={15} />
              </button>
            </div>
          </div>

          <input
            ref={photoInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={uploadPhoto}
          />

          {uploading && (
            <p className="mt-2 text-center text-xs text-[#D8E9AC]">
              Caricamento fotografia…
            </p>
          )}
        </section>

        {/* Informazioni principali */}
        <section className={`${card} space-y-4`}>
          <h2 className="font-display text-base font-semibold text-white">
            Informazioni Principali
          </h2>

          <label>
            <span className={label}>Nome del Piatto</span>
            <input
              className={input}
              value={r.name_it}
              onChange={(event) => set("name_it", event.target.value)}
              required
            />
          </label>

          {pairedFields("Nome", "name_it", "name_en")}
          {pairedFields("Etichetta", "tag_it", "tag_en")}

          <label>
            <span className={label}>Categoria</span>
            <div className="relative">
              <select
                className={`${input} appearance-none pr-10`}
                value={r.category}
                onChange={(event) => set("category", event.target.value)}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label.it}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3.5 text-[#B5CBC9]" size={18} />
            </div>
          </label>

          <div className="rounded-lg bg-[#152222] p-3">
            <label>
              <span className={label}>Prezzo Carta (€)</span>
              <input
                type="number"
                min="0"
                step="0.50"
                className="w-full bg-transparent font-display text-xl font-bold text-[#D8E9AC] outline-none"
                value={r.price}
                onChange={(event) => set("price", Number(event.target.value))}
              />
            </label>
            <p className="mt-1 text-[10px] text-[#999999]">IVA inclusa</p>
          </div>

          <div>
            <span className={label}>Descrizione per il Cliente (IT)</span>
            <textarea
              rows={4}
              className={`${input} resize-y leading-relaxed`}
              value={r.description_it}
              onChange={(event) => set("description_it", event.target.value)}
            />
          </div>

          <div>
            <span className={label}>Descrizione per il Cliente (EN)</span>
            <textarea
              rows={4}
              className={`${input} resize-y leading-relaxed`}
              value={r.description_en}
              onChange={(event) => set("description_en", event.target.value)}
            />
          </div>

          <label>
            <span className={label}>Ordine di visualizzazione</span>
            <input
              type="number"
              className={input}
              value={r.sort_order}
              onChange={(event) => set("sort_order", Number(event.target.value))}
            />
          </label>
        </section>

        {/* Ingredienti */}
        <section className={`${card} space-y-3`}>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-white">
              Ingredienti
            </h2>
            <span className="text-[11px] font-semibold text-[#B5CBC9]">
              {ingredients.length} Componenti
            </span>
          </div>

          <div className="space-y-2">
            {ingredients.map((ingredient, index) => (
              <div
                key={`${ingredient}-${index}`}
                className="flex items-center justify-between gap-3 rounded-lg bg-[#152222] px-3 py-3"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="text-[#89918E]">⠿</span>
                  <span className="truncate text-xs font-semibold text-white">
                    {ingredient}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeIngredient(index)}
                  aria-label={`Rimuovi ${ingredient}`}
                  className="shrink-0 text-[#B5CBC9] transition hover:text-[#FFB4AB]"
                >
                  <X size={17} />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIngredientModal(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#20302F] py-3 text-xs font-semibold text-[#D8E9AC] transition hover:bg-[#2A3D3B]"
          >
            <Plus size={17} />
            Aggiungi Ingrediente
          </button>

          <p className="text-[10px] leading-relaxed text-[#89918E]">
            L'elenco degli ingredienti viene salvato nei campi già presenti nel database.
          </p>
        </section>

        {/* Allergeni */}
        <section className={`${card} space-y-3`}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-base font-semibold text-white">
              Allergeni &amp; Intolleranze
            </h2>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#B5CBC9]">
              Reg. UE 1169/11
            </span>
          </div>

          <p className="text-xs leading-relaxed text-[#999999]">
            Indica le sostanze effettivamente contenute o a rischio di contaminazione incrociata.
          </p>

          <div className="space-y-2">
            {allergens
              .filter((item) => tempAllergens.includes(item.id))
              .map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg bg-[#152222] px-3 py-2.5"
                >
                  <span className="flex items-center gap-2.5 text-xs text-white">
                    <span>{item.icon}</span>
                    {item.name}
                  </span>
                  <span className="rounded-full bg-[#D8E9AC] px-2.5 py-1 text-[9px] font-bold text-[#0B1818]">
                    PRESENTE
                  </span>
                </div>
              ))}
            {tempAllergens.length === 0 && (
              <p className="rounded-lg bg-[#152222] p-3 text-center text-xs text-[#999999]">
                Nessun allergene selezionato.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setTempAllergens([...(r.allergens as AllergenId[])]);
              setAllergenModal(true);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#20302F] py-3 text-xs font-semibold text-[#D8E9AC]"
          >
            <SlidersHorizontal size={16} />
            Modifica Allergeni
          </button>
        </section>

        {/* Abbinamento enologico */}
        <section className={`${card} space-y-3`}>
          <h2 className="font-display text-base font-semibold text-white">
            Pairing Enologico Consigliato
          </h2>

          {pairedFields("Vino consigliato", "sommelier_wine_it", "sommelier_wine_en")}
          {pairedFields("Nota sull'abbinamento", "sommelier_note_it", "sommelier_note_en", true)}
        </section>

        {/* Badge e visibilità */}
        <section className={`${card} space-y-4`}>
          <h2 className="font-display text-base font-semibold text-white">
            Badge &amp; Visibilità
          </h2>

          <div className="flex flex-wrap gap-2">
            {r.tag_it && (
              <span className="rounded-full bg-[#D8E9AC] px-3 py-1.5 text-[10px] font-semibold text-[#0B1818]">
                ◈ {r.tag_it}
              </span>
            )}
            <span className="rounded-full bg-[#20302F] px-3 py-1.5 text-[10px] text-[#B5CBC9]">
              {r.tag_en || "Nessuna etichetta EN"}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg bg-[#152222] p-3">
            <div>
              <p className="text-xs font-semibold text-white">Piatto Attivo nel Menu</p>
              <p className="mt-1 text-[10px] text-[#999999]">
                Visibile ai clienti nel menu digitale
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={r.visible}
              onClick={() => set("visible", !r.visible)}
              className={`flex h-6 w-12 items-center rounded-full p-0.5 transition ${r.visible ? "justify-end bg-[#D8E9AC]" : "justify-start bg-[#45483D]"}`}
            >
              <span className="h-5 w-5 rounded-full bg-[#0B1818] shadow" />
            </button>
          </div>

          <div className="rounded-lg bg-[#152222] p-3">
            <p className="text-xs font-semibold text-white">Ordine da Smartphone / QR</p>
            <p className="mt-1 text-[10px] leading-relaxed text-[#999999]">
              Questa opzione è mostrata nel progetto grafico, ma non è ancora collegata a un campo del database.
            </p>
          </div>

          <div className="rounded-lg bg-[#152222] p-3">
            <p className="text-xs font-semibold text-white">Piatto in Esaurimento / Stock Limitato</p>
            <p className="mt-1 text-[10px] leading-relaxed text-[#999999]">
              La gestione delle porzioni residue richiederà campi dedicati nel database.
            </p>
          </div>
        </section>

        {/* Zona rischio */}
        {!isNew && (
          <section className={`${card} space-y-3`}>
            <div className="flex items-center gap-2 text-[#FFB4AB]">
              <AlertTriangle size={17} />
              <h2 className="font-display text-sm font-semibold">Zona Rischio</h2>
            </div>
            <p className="text-xs leading-relaxed text-[#999999]">
              L'eliminazione rimuoverà definitivamente il piatto dal menu.
            </p>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Eliminare definitivamente "${r.name_it}"?`)) {
                  onDelete?.();
                }
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#3A2022] py-3 text-xs font-bold uppercase tracking-wider text-[#FFB4AB] transition hover:bg-[#51282A]"
            >
              <Trash2 size={16} />
              Elimina Piatto dal Percorso
            </button>
          </section>
        )}

        {/* Pulsanti finali */}
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onDone} className={buttonSecondary}>
            Annulla
          </button>
          <button type="submit" disabled={busy || uploading} className={buttonPrimary}>
            <Check size={16} />
            {busy ? "Salvataggio…" : "Salva Piatto"}
          </button>
        </div>
      </form>

      {/* MODALE AGGIUNGI INGREDIENTE */}
      {ingredientModal && (
        <div className="fixed inset-0 z-[80] flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#081616]">
          <header className="z-10 shrink-0 border-b border-white/10 bg-[#111E1E] pt-[env(safe-area-inset-top)]">
            <div className="mx-auto flex min-h-16 max-w-lg items-center justify-between gap-3 px-5 py-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIngredientModal(false)}
                  className="text-white"
                >
                  <ArrowLeft size={21} />
                </button>
                <div>
                  <h2 className="font-display text-base font-semibold text-white">
                    Aggiungi Ingrediente
                  </h2>
                  <p className="text-[10px] text-[#999999]">
                    Distinta base, provenienza e dosaggio
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setIngredientModal(false)}>
                <X size={20} />
              </button>
            </div>
          </header>

          <div className="mx-auto min-h-0 w-full max-w-lg flex-1 overflow-y-auto overscroll-contain px-5 py-6">
            <div className="space-y-7 pb-6">
              <label className="block">
                <span className={label}>Cerca o Inserisci Materia Prima</span>
                <input
                  autoFocus
                  className={`${input} min-h-12`}
                  value={ingredientName}
                  onChange={(event) => setIngredientName(event.target.value)}
                  placeholder="es. Pistacchio Verde di Bronte DOP"
                />
              </label>

              <label className="block">
                <span className={label}>Categoria Distinta Base</span>
                <select
                  className={`${input} min-h-12`}
                  value={ingredientCategory}
                  onChange={(event) => setIngredientCategory(event.target.value)}
                >
                  {ingredientCategories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block min-w-0">
                  <span className={label}>Dosaggio / Grammi</span>
                  <input
                    className={`${input} min-h-12`}
                    value={ingredientDosage}
                    onChange={(event) => setIngredientDosage(event.target.value)}
                    placeholder="es. 50 g"
                  />
                </label>
                <label className="block min-w-0">
                  <span className={label}>Provenienza / Territorio</span>
                  <input
                    className={`${input} min-h-12`}
                    value={ingredientOrigin}
                    onChange={(event) => setIngredientOrigin(event.target.value)}
                    placeholder="es. Sicilia / Etna"
                  />
                </label>
              </div>

              <label className="block">
                <span className={label}>Presidio / Certificazione</span>
                <select
                  className={`${input} min-h-12`}
                  value={ingredientCertification}
                  onChange={(event) => setIngredientCertification(event.target.value)}
                >
                  {certifications.map((certification) => (
                    <option key={certification}>{certification}</option>
                  ))}
                </select>
              </label>

              <div>
                <span className={label}>Allergeni Noti Associati</span>
                <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
                  {allergens.map((item) => (
                    <label
                      key={item.id}
                      className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-white/[0.07] bg-[#152222] px-3 py-3 text-xs text-white"
                    >
                      <input
                        type="checkbox"
                        checked={ingredientAllergens.includes(item.id)}
                        onChange={() =>
                          setIngredientAllergens((current) =>
                            current.includes(item.id)
                              ? current.filter((id) => id !== item.id)
                              : [...current, item.id],
                          )
                        }
                        className="h-4 w-4 shrink-0 accent-[#D8E9AC]"
                      />
                      <span className="min-w-0 leading-snug">{item.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <p className="rounded-lg border border-[#D8E9AC]/15 bg-[#152222] p-4 text-[11px] leading-relaxed text-[#999999]">
                In questa versione vengono salvati il nome dell'ingrediente e gli allergeni associati. Categoria, dosaggio, provenienza e certificazione resteranno temporanei finché non saranno aggiunti i relativi campi al database.
              </p>
            </div>
          </div>

          <footer className="z-10 shrink-0 border-t border-white/10 bg-[#111E1E] px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
            <div className="mx-auto grid max-w-lg grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIngredientModal(false)}
                className={`${buttonSecondary} min-w-0`}
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={addIngredient}
                className={`${buttonPrimary} min-w-0 px-3`}
              >
                <Plus size={16} />
                <span className="truncate">Aggiungi</span>
              </button>
            </div>
          </footer>
        </div>
      )}

      {/* MODALE MODIFICA ALLERGENI */}
      {allergenModal && (
        <div className="fixed inset-0 z-[90] flex flex-col bg-[#081616]">
          <header className="border-b border-white/10 bg-[#111E1E] pt-[env(safe-area-inset-top)]">
            <div className="mx-auto flex h-16 max-w-lg items-center justify-between px-4">
              <div className="flex min-w-0 items-center gap-3">
                <button type="button" onClick={() => setAllergenModal(false)}>
                  <ArrowLeft size={21} />
                </button>
                <div className="min-w-0">
                  <h2 className="truncate font-display text-base font-semibold text-white">
                    Modifica Allergeni
                  </h2>
                  <p className="text-[10px] text-[#999999]">
                    Reg. UE 1169/11 · 14 allergeni normativi
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setAllergenModal(false)}>
                <X size={20} />
              </button>
            </div>
          </header>

          <div className="mx-auto w-full max-w-lg flex-1 space-y-3 overflow-y-auto px-4 py-4">
            <div className="rounded-xl border border-white/10 bg-[#111E1E] p-3">
              <p className="text-xs leading-relaxed text-[#999999]">
                Seleziona gli allergeni effettivamente contenuti o a rischio contaminazione incrociata per il piatto.
              </p>
            </div>

            {allergens.map((item) => {
              const active = tempAllergens.includes(item.id);
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl bg-[#152222] px-3.5 py-3"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-xs font-medium text-white">
                      {item.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={active}
                    onClick={() => toggleAllergen(item.id)}
                    className={`flex h-6 w-11 items-center rounded-full p-0.5 transition ${active ? "justify-end bg-[#D8E9AC]" : "justify-start bg-[#2A3737]"}`}
                  >
                    <span className={`h-5 w-5 rounded-full shadow ${active ? "bg-[#0B1818]" : "bg-[#89918E]"}`} />
                  </button>
                </div>
              );
            })}
          </div>

          <footer className="border-t border-white/10 bg-[#111E1E]/95 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-xl">
            <div className="mx-auto flex max-w-lg gap-3">
              <button
                type="button"
                onClick={() => setAllergenModal(false)}
                className={`${buttonSecondary} flex-1`}
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => {
                  set("allergens", tempAllergens);
                  setAllergenModal(false);
                  toast.success("Allergeni aggiornati. Ricordati di salvare il piatto.");
                }}
                className={`${buttonPrimary} flex-[1.4]`}
              >
                <Check size={16} />
                Salva Allergeni
              </button>
            </div>
          </footer>
        </div>
      )}

      {/* MODALE ANTEPRIMA OSPITE */}
      {previewModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          onClick={(event) => {
            if (event.target === event.currentTarget) setPreviewModal(false);
          }}
        >
          <div className="flex max-h-[90vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111E1E] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 bg-[#152222] px-4 py-3">
              <div>
                <h3 className="font-display text-sm font-semibold text-[#D8E9AC]">
                  Anteprima Vista Ospite
                </h3>
                <p className="text-[10px] text-[#999999]">
                  Menu digitale · Anteprima
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModal(false)}
                className="rounded-lg bg-[#20302F] p-2"
              >
                <X size={17} />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto p-4">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[#20302F]">
                {photo ? (
                  <img src={photo} alt={r.name_it} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-[#999999]">
                    Nessuna fotografia
                  </div>
                )}
                {r.tag_it && (
                  <span className="absolute left-3 top-3 rounded-full bg-[#D8E9AC] px-2 py-1 text-[9px] font-bold uppercase text-[#0B1818]">
                    {r.tag_it}
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-start justify-between gap-3">
                  <h4 className="font-display text-lg font-semibold text-white">
                    {r.name_it || "Nome del piatto"}
                  </h4>
                  <span className="shrink-0 font-display text-base font-bold text-[#D8E9AC]">
                    {new Intl.NumberFormat("it-IT", {
                      style: "currency",
                      currency: "EUR",
                    }).format(Number(r.price) || 0)}
                  </span>
                </div>
                {r.tag_it && (
                  <p className="mt-1 font-display text-xs italic text-[#B5CBC9]">
                    {r.tag_it}
                  </p>
                )}
                <p className="mt-3 text-xs leading-relaxed text-[#B5CBC9]">
                  {r.description_it}
                </p>
              </div>

              {ingredients.length > 0 && (
                <div className="rounded-lg bg-[#152222] p-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#D8E9AC]">
                    Ingredienti
                  </p>
                  <p className="text-xs leading-relaxed text-[#B5CBC9]">
                    {ingredients.join(", ")}
                  </p>
                </div>
              )}

              {tempAllergens.length > 0 && (
                <div className="rounded-lg bg-[#152222] p-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#D8E9AC]">
                    Allergeni
                  </p>
                  <p className="text-xs leading-relaxed text-[#B5CBC9]">
                    {tempAllergens
                      .map((id) => allergenLabels[id].it)
                      .join(", ")}
                  </p>
                </div>
              )}

              {r.sommelier_wine_it && (
                <div className="flex items-center justify-between gap-3 rounded-lg bg-[#152222] p-3">
                  <div>
                    <p className="text-[10px] text-[#999999]">
                      Abbinamento consigliato
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[#D8E9AC]">
                      {r.sommelier_wine_it}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/10 bg-[#111E1E] p-3">
              <button
                type="button"
                onClick={() => setPreviewModal(false)}
                className={`${buttonPrimary} w-full`}
              >
                Chiudi Anteprima
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
