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
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { DishRow } from "@/lib/menu-api";
import {
  allergenLabels,
  categories,
  type AllergenId,
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

const certifications = [
  "Nessuna",
  "Presidio Slow Food",
  "DOP",
  "IGP",
  "Bio Etna",
  "Tradizionale",
];

const input =
  "w-full min-w-0 rounded-xl border border-white/10 bg-[#152222] px-3.5 py-3 text-base text-[#EEEEEE] outline-none transition placeholder:text-[#777F7D] focus:border-[#D8E9AC] focus:ring-1 focus:ring-[#D8E9AC]";

const label =
  "mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#B5CBC9]";

const card = "rounded-xl bg-[#111E1E] p-4 shadow-sm";

const buttonPrimary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#D8E9AC] px-5 text-xs font-bold uppercase tracking-wider text-[#0B1818] transition hover:bg-[#E5F0C8] disabled:opacity-50";

const buttonSecondary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#20302F] px-4 text-xs font-semibold text-[#EEEEEE] transition hover:bg-[#2A3D3B]";

function imageUrl(value: string | null) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;

  return supabase.storage
    .from("dish-photos")
    .getPublicUrl(value).data.publicUrl;
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
  const [ingredientDosage, setIngredientDosage] = useState("");
  const [ingredientOrigin, setIngredientOrigin] = useState("");
  const [ingredientCertification, setIngredientCertification] =
    useState("Nessuna");
  const [ingredientAllergens, setIngredientAllergens] = useState<
    AllergenId[]
  >([]);

  const [tempAllergens, setTempAllergens] = useState<AllergenId[]>(
    (initial.allergens ?? []) as AllergenId[],
  );

  // Questi due interruttori sono solamente grafici:
  // non vengono salvati perché al momento non esistono campi DB dedicati.
  const [qrEnabled, setQrEnabled] = useState(true);
  const [stockEnabled, setStockEnabled] = useState(false);

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

  const toggleQr = () => setQrEnabled((current) => !current);
  const toggleStock = () => setStockEnabled((current) => !current);

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

    setR((current) => {
      const updatedAllergens = Array.from(
        new Set([
          ...((current.allergens ?? []) as AllergenId[]),
          ...ingredientAllergens,
        ]),
      );

      return {
        ...current,
        ingredients_it: [...(current.ingredients_it ?? []), name],
        ingredients_en: [...(current.ingredients_en ?? []), name],
        allergens: updatedAllergens,
      };
    });

    setTempAllergens((current) =>
      Array.from(new Set([...current, ...ingredientAllergens])),
    );

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
      ingredients_it: (current.ingredients_it ?? []).filter(
        (_, i) => i !== index,
      ),
      ingredients_en: (current.ingredients_en ?? []).filter(
        (_, i) => i !== index,
      ),
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
      allergens: r.allergens ?? [],
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

  const Toggle = ({
    checked,
    onChange,
  }: {
    checked: boolean;
    onChange: () => void;
  }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition ${
        checked ? "justify-end bg-[#D8E9AC]" : "justify-start bg-[#45483D]"
      }`}
    >
      <span className="h-5 w-5 rounded-full bg-[#0B1818] shadow" />
    </button>
  );

  return (
    <div className="min-h-screen bg-[#081616] pb-10 font-body text-[#D7E5E5]">
      {/* HEADER */}
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/[0.06] bg-[#081616]/95 pt-[env(safe-area-inset-top)] shadow-lg backdrop-blur-xl">
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

      <form
        onSubmit={save}
        className="mx-auto flex max-w-lg flex-col gap-4 px-3 pb-10 pt-20"
      >
        {/* FOTOGRAFIA */}
        <section className="rounded-xl bg-[#111E1E] p-3 shadow-md">
          <div className="group relative h-48 overflow-hidden rounded-lg bg-[#20302F] sm:h-64">
            {photo ? (
              <img
                src={photo}
                alt={r.name_it}
                className="h-full w-full object-cover"
              />
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
                className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#20302F]/95 px-2 py-2 text-[11px] font-semibold text-white backdrop-blur"
              >
                <Camera size={15} className="text-[#D8E9AC]" />
                Foto
              </button>

              <button
                type="button"
                onClick={() => setPreviewModal(true)}
                className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#D8E9AC] px-2 py-2 text-[11px] font-semibold text-[#0B1818]"
              >
                <Eye size={15} />
                Anteprima
              </button>

              <button
                type="button"
                onClick={() => photoInput.current?.click()}
                aria-label="Sostituisci fotografia"
                className="grid min-h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#20302F]/95 text-white"
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

        {/* INFORMAZIONI PRINCIPALI */}
        <section className={`${card} space-y-4`}>
          <h2 className="font-display text-base font-semibold text-white">
            Informazioni Principali
          </h2>

          <label className="block">
            <span className={label}>Nome del Piatto</span>
            <input
              className={input}
              value={r.name_it}
              onChange={(event) => set("name_it", event.target.value)}
              required
            />
          </label>

          <label className="block">
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

              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#B5CBC9]"
                size={18}
              />
            </div>
          </label>
                    <div className="rounded-lg bg-[#152222] p-3">
            <label className="block">
              <span className={label}>Prezzo Carta (€)</span>
              <input
                type="number"
                min="0"
                step="0.50"
                className="w-full bg-transparent font-display text-2xl font-bold text-[#D8E9AC] outline-none"
                value={r.price}
                onChange={(event) => set("price", Number(event.target.value))}
              />
            </label>
            <p className="mt-1 text-[10px] text-[#999999]">IVA inclusa</p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className={label}>Descrizione per il Cliente</span>
              <span className="shrink-0 text-[10px] text-[#89918E]">
                {(r.description_it ?? "").length} caratteri
              </span>
            </div>

            <textarea
              rows={4}
              className={`${input} resize-y leading-relaxed`}
              value={r.description_it ?? ""}
              onChange={(event) => set("description_it", event.target.value)}
              placeholder="Descrivi il piatto per i tuoi clienti..."
            />

            <button
              type="button"
              onClick={() =>
                toast.info(
                  "La funzione di miglioramento con AI sarà disponibile in una prossima versione.",
                )
              }
              className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#D8E9AC]/20 bg-[#152222] px-3 py-2 text-xs font-semibold text-[#D8E9AC] transition hover:bg-[#20302F]"
            >
              <Sparkles size={15} />
              Migliora con AI
            </button>
          </div>
        </section>

        {/* INGREDIENTI */}
        <section className={`${card} space-y-3`}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-base font-semibold text-white">
              Ingredienti
            </h2>
            <span className="shrink-0 text-[11px] font-semibold text-[#B5CBC9]">
              {ingredients.length} Componenti
            </span>
          </div>

          <div className="space-y-2">
            {ingredients.map((ingredient, index) => (
              <div
                key={`${ingredient}-${index}`}
                className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-[#152222] px-3 py-3"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="shrink-0 text-[#89918E]">⠿</span>
                  <span className="truncate text-xs font-semibold text-white">
                    {ingredient}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => removeIngredient(index)}
                  aria-label={`Rimuovi ${ingredient}`}
                  className="shrink-0 p-1 text-[#B5CBC9] transition hover:text-[#FFB4AB]"
                >
                  <X size={17} />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIngredientModal(true)}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#20302F] py-3 text-xs font-semibold text-[#D8E9AC] transition hover:bg-[#2A3D3B]"
          >
            <Plus size={17} />
            Aggiungi Ingrediente
          </button>
        </section>

        {/* ALLERGENI */}
        <section className={`${card} space-y-3`}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-base font-semibold text-white">
              Allergeni
            </h2>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#B5CBC9]">
              Reg. UE 1169/11
            </span>
          </div>

          <p className="text-xs leading-relaxed text-[#999999]">
            Indica le sostanze effettivamente contenute o a rischio di
            contaminazione incrociata.
          </p>

          <div className="space-y-2">
            {tempAllergens.length > 0 ? (
              allergens
                .filter((item) => tempAllergens.includes(item.id))
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-[#152222] px-3 py-2.5"
                  >
                    <span className="min-w-0 text-xs text-white">
                      {item.name}
                    </span>
                    <span className="shrink-0 rounded-full bg-[#D8E9AC] px-2.5 py-1 text-[9px] font-bold text-[#0B1818]">
                      PRESENTE
                    </span>
                  </div>
                ))
            ) : (
              <p className="rounded-lg bg-[#152222] p-3 text-center text-xs text-[#999999]">
                Nessun allergene selezionato.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setTempAllergens([...(r.allergens ?? [])] as AllergenId[]);
              setAllergenModal(true);
            }}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#20302F] py-3 text-xs font-semibold text-[#D8E9AC]"
          >
            <SlidersHorizontal size={16} />
            Modifica Allergeni
          </button>
        </section>

        {/* PAIRING ENOLOGICO */}
        <section className={`${card} space-y-4`}>
          <h2 className="font-display text-base font-semibold text-white">
            Pairing Enologico Consigliato
          </h2>

          <div className="rounded-lg bg-[#152222] p-3">
            <label className="block min-w-0">
              <span className={label}>Vino consigliato (IT)</span>
              <input
                className={input}
                value={r.sommelier_wine_it ?? ""}
                onChange={(event) => set("sommelier_wine_it", event.target.value)}
              />
            </label>
          </div>

          <div className="rounded-lg bg-[#152222] p-3">
            <label className="block min-w-0">
              <span className={label}>Nota sull'abbinamento (IT)</span>
              <textarea
                rows={3}
                className={`${input} resize-y leading-relaxed`}
                value={r.sommelier_note_it ?? ""}
                onChange={(event) => set("sommelier_note_it", event.target.value)}
              />
            </label>
          </div>
        </section>

        {/* BADGE E VISIBILITÀ */}
        <section className={`${card} space-y-4`}>
          <h2 className="font-display text-base font-semibold text-white">
            Badge &amp; Visibilità
          </h2>

          <div>
            <span className={label}>Badge del Piatto</span>
            <div className="flex flex-wrap gap-2">
              {r.tag_it ? (
                <span className="rounded-full bg-[#D8E9AC] px-3 py-2 text-[10px] font-semibold text-[#0B1818]">
                  ◈ {r.tag_it}
                </span>
              ) : (
                <span className="rounded-full bg-[#20302F] px-3 py-2 text-[10px] text-[#B5CBC9]">
                  Nessun badge selezionato
                </span>
              )}

              {r.tag_en && (
                <span className="rounded-full bg-[#20302F] px-3 py-2 text-[10px] text-[#B5CBC9]">
                  {r.tag_en}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-lg bg-[#152222] p-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white">
                  Piatto Attivo nel Menu
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-[#999999]">
                  Visibile ai clienti nel menu digitale
                </p>
              </div>
              <Toggle
                checked={Boolean(r.visible)}
                onChange={() => set("visible", !r.visible)}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg bg-[#152222] p-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white">
                  Abilita Ordine da Smartphone / QR
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-[#999999]">
                  Consente l'ordine tramite QR Code
                </p>
              </div>
              <Toggle checked={qrEnabled} onChange={toggleQr} />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg bg-[#152222] p-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white">
                  Piatto in Esaurimento / Stock Limitato
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-[#999999]">
                  Segnala ai clienti la disponibilità limitata
                </p>
              </div>
              <Toggle checked={stockEnabled} onChange={toggleStock} />
            </div>
          </div>

          <p className="text-[10px] leading-relaxed text-[#89918E]">
            Gli interruttori QR e disponibilità sono temporanei: non vengono
            ancora salvati nel database. La visibilità del piatto, invece,
            viene salvata regolarmente.
          </p>
        </section>

        {/* ZONA RISCHIO */}
        {!isNew && (
          <section className={`${card} space-y-3`}>
            <div className="flex items-center gap-2 text-[#FFB4AB]">
              <AlertTriangle size={17} />
              <h2 className="font-display text-sm font-semibold">
                Zona Rischio
              </h2>
            </div>

            <p className="text-xs leading-relaxed text-[#999999]">
              Questa azione è irreversibile. Il piatto verrà eliminato
              definitivamente dal menu.
            </p>

            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    `Eliminare definitivamente "${r.name_it}"?`,
                  )
                ) {
                  onDelete?.();
                }
              }}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#3A2022] py-3 text-xs font-bold uppercase tracking-wider text-[#FFB4AB] transition hover:bg-[#51282A]"
            >
              <Trash2 size={16} />
              Elimina Piatto
            </button>
          </section>
        )}

        {/* PULSANTI FINALI */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={onDone}
            className={buttonSecondary}
          >
            Annulla
          </button>

          <button
            type="submit"
            disabled={busy || uploading}
            className={buttonPrimary}
          >
            <Check size={16} />
            {busy ? "Salvataggio…" : "Salva Piatto"}
          </button>
        </div>
      </form>

      {/* MODALE AGGIUNGI INGREDIENTE */}
      {ingredientModal && (
        <div className="fixed inset-0 z-[80] flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#081616]">
          <header className="z-10 shrink-0 border-b border-white/10 bg-[#111E1E] pt-[env(safe-area-inset-top)]">
            <div className="mx-auto flex min-h-16 w-full max-w-lg items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIngredientModal(false)}
                  className="shrink-0 text-white"
                  aria-label="Indietro"
                >
                  <ArrowLeft size={21} />
                </button>

                <div className="min-w-0">
                  <h2 className="font-display text-base font-semibold text-white">
                    Aggiungi Ingrediente
                  </h2>
                  <p className="text-[10px] text-[#999999]">
                    Distinta base, provenienza e dosaggio
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIngredientModal(false)}
                className="shrink-0 p-1 text-white"
                aria-label="Chiudi"
              >
                <X size={20} />
              </button>
            </div>
          </header>

          <div className="mx-auto min-h-0 w-full max-w-lg flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-5 sm:px-5 sm:py-6">
            <div className="space-y-5 pb-6">
              <label className="block min-w-0">
                <span className={label}>
                  Cerca o Inserisci Materia Prima
                </span>
                <input
                  className={`${input} min-h-12`}
                  value={ingredientName}
                  onChange={(event) =>
                    setIngredientName(event.target.value)
                  }
                  placeholder="es. Pistacchio Verde di Bronte DOP"
                />
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block min-w-0">
                  <span className={label}>Dosaggio / Grammi</span>
                  <input
                    className={`${input} min-h-12`}
                    value={ingredientDosage}
                    onChange={(event) =>
                      setIngredientDosage(event.target.value)
                    }
                    placeholder="es. 50 g"
                  />
                </label>

                <label className="block min-w-0">
                  <span className={label}>Provenienza / Territorio</span>
                  <input
                    className={`${input} min-h-12`}
                    value={ingredientOrigin}
                    onChange={(event) =>
                      setIngredientOrigin(event.target.value)
                    }
                    placeholder="es. Sicilia / Etna"
                  />
                </label>
              </div>

              <label className="block min-w-0">
                <span className={label}>Presidio / Certificazione</span>
                <select
                  className={`${input} min-h-12`}
                  value={ingredientCertification}
                  onChange={(event) =>
                    setIngredientCertification(event.target.value)
                  }
                >
                  {certifications.map((certification) => (
                    <option key={certification} value={certification}>
                      {certification}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <span className={label}>Allergeni Noti Associati</span>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {allergens.map((item) => (
                    <label
                      key={item.id}
                      className="flex min-h-12 min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-white/[0.07] bg-[#152222] px-3 py-3 text-xs text-white"
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
                        className="h-5 w-5 shrink-0 accent-[#D8E9AC]"
                      />
                      <span className="min-w-0 leading-snug">
                        {item.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <p className="rounded-lg border border-[#D8E9AC]/15 bg-[#152222] p-3 text-[11px] leading-relaxed text-[#999999]">
                In questa versione vengono salvati il nome
                dell'ingrediente e gli allergeni associati. Dosaggio,
                provenienza e certificazione resteranno
                temporanei finché non saranno aggiunti i relativi campi
                al database.
              </p>
            </div>
          </div>

          <footer className="z-10 shrink-0 border-t border-white/10 bg-[#111E1E] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3">
            <div className="mx-auto grid w-full max-w-lg grid-cols-2 gap-3">
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
        <div className="fixed inset-0 z-[90] flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#081616]">
          <header className="shrink-0 border-b border-white/10 bg-[#111E1E] pt-[env(safe-area-inset-top)]">
            <div className="mx-auto flex min-h-16 max-w-lg items-center justify-between gap-3 px-4">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAllergenModal(false)}
                  className="shrink-0"
                  aria-label="Indietro"
                >
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

              <button
                type="button"
                onClick={() => setAllergenModal(false)}
                className="shrink-0"
                aria-label="Chiudi"
              >
                <X size={20} />
              </button>
            </div>
          </header>
                    <div className="mx-auto min-h-0 w-full max-w-lg flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4">
            <div className="rounded-xl border border-white/10 bg-[#111E1E] p-3">
              <p className="text-xs leading-relaxed text-[#999999]">
                Seleziona gli allergeni effettivamente contenuti o a
                rischio contaminazione incrociata per il piatto.
              </p>
            </div>

            {allergens.map((item) => {
              const active = tempAllergens.includes(item.id);

              return (
                <div
                  key={item.id}
                  className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-[#152222] px-3.5 py-3"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="shrink-0 text-lg">{item.icon}</span>
                    <span className="min-w-0 text-xs font-medium text-white">
                      {item.name}
                    </span>
                  </div>

                  <Toggle
                    checked={active}
                    onChange={() => toggleAllergen(item.id)}
                  />
                </div>
              );
            })}
          </div>

          <footer className="shrink-0 border-t border-white/10 bg-[#111E1E]/95 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-xl">
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
                  toast.success(
                    "Allergeni aggiornati. Ricordati di salvare il piatto.",
                  );
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
            if (event.target === event.currentTarget) {
              setPreviewModal(false);
            }
          }}
        >
          <div className="flex max-h-[90dvh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111E1E] shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#152222] px-4 py-3">
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
                aria-label="Chiudi anteprima"
              >
                <X size={17} />
              </button>
            </div>

            <div className="min-h-0 space-y-4 overflow-y-auto p-4">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[#20302F]">
                {photo ? (
                  <img
                    src={photo}
                    alt={r.name_it}
                    className="h-full w-full object-cover"
                  />
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
                <div className="rounded-lg bg-[#152222] p-3">
                  <p className="text-[10px] text-[#999999]">
                    Abbinamento consigliato
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[#D8E9AC]">
                    {r.sommelier_wine_it}
                  </p>
                  {r.sommelier_note_it && (
                    <p className="mt-2 text-xs leading-relaxed text-[#B5CBC9]">
                      {r.sommelier_note_it}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-white/10 bg-[#111E1E] p-3">
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
