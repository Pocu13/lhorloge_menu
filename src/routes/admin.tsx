import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Eye, EyeOff, LogOut, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { allDishesQuery, type DishRow } from "@/lib/menu-api";
import { allergenLabels, categories, dietLabels, formatPrice, type AllergenId, type DietId } from "@/lib/menu-data";
import { ClockMark } from "@/components/menu-ui";
import { cn } from "@/lib/utils";

/** Username "admin" maps to this account; the typed password is prefixed so short PINs meet the minimum length. */
const ADMIN_EMAIL = "admin@lhorloge.it";
const toAuthPassword = (p: string) => p;

const PHOTO_BUCKET = "dish-photos";

/** True when the value is a Storage object path rather than an absolute URL. */
function isStoragePath(value: string | null | undefined): value is string {
  return Boolean(value?.trim() && !/^https?:\/\//i.test(value.trim()));
}

/** Resolve a Storage path to its permanent public URL. */
function photoUrl(value: string | null | undefined): string | undefined {
  if (!value?.trim()) return undefined;

  const image = value.trim();

  // Compatibility with old records that still contain an absolute URL.
  if (/^https?:\/\//i.test(image)) return image;

  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(image).data.publicUrl;
}

/** Remove a photo from Storage only when the database value is a Storage path. */
async function deleteStoredPhoto(path: string | null | undefined): Promise<string | null> {
  if (!isStoragePath(path)) return null;

  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove([path]);
  return error?.message ?? null;
}

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

      const { data: ok } = await supabase.rpc("has_role", {
        _user_id: data.user.id,
        _role: "admin",
      });

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
            <button
              onClick={() => supabase.auth.signOut()}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-title"
            >
              <LogOut className="h-4 w-4" /> Esci
            </button>
          )}
        </div>
      </header>

      {state === "loading" && (
        <p className="p-10 text-center text-muted-foreground">…</p>
      )}

      {(state === "out" || state === "denied") && <Login />}
      {state === "in" && <Editor />}
    </div>
  );
}

const input =
  "w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm text-foreground focus:border-sage focus:outline-none";

function Login() {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (user.trim().toLowerCase() !== "admin") {
      toast.error("Credenziali non valide");
      return;
    }

    setBusy(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: toAuthPassword(pass),
    });

    setBusy(false);

    if (error) toast.error(error.message);
  };

  return (
    <form
      onSubmit={submit}
      className="mx-auto mt-16 max-w-sm space-y-4 rounded-lg border border-border/40 bg-card p-6"
    >
      <h1 className="font-display text-2xl text-title">Accesso admin</h1>

      <label className="block text-sm text-muted-foreground">
        Utente
        <input
          className={cn(input, "mt-1")}
          value={user}
          onChange={(e) => setUser(e.target.value)}
          autoComplete="username"
        />
      </label>

      <label className="block text-sm text-muted-foreground">
        Password
        <input
          type="password"
          className={cn(input, "mt-1")}
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          autoComplete="current-password"
        />
      </label>

      <button
        disabled={busy}
        className="min-h-11 w-full rounded-full bg-sage text-sm font-semibold text-sage-foreground disabled:opacity-60"
      >
        Entra
      </button>
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

  const remove = async (r: DishRow) => {
    if (!confirm(`Eliminare "${r.name_it}"?`)) return;

    const { error } = await supabase.from("dishes").delete().eq("id", r.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    const photoError = await deleteStoredPhoto(r.image);

    if (photoError) {
      toast.error(`Piatto eliminato, ma non è stato possibile cancellare la foto: ${photoError}`);
    } else {
      toast.success("Piatto eliminato");
    }

    qc.invalidateQueries({ queryKey: ["dishes"] });
  };

  const toggle = async (r: DishRow) => {
    const { error } = await supabase
      .from("dishes")
      .update({ visible: !r.visible })
      .eq("id", r.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(
      r.visible ? "Piatto nascosto dal menu" : "Piatto di nuovo visibile",
    );

    qc.invalidateQueries({ queryKey: ["dishes"] });
  };

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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl text-title">
          Piatti ({data.length})
        </h1>

        <button
          onClick={() =>
            setEdit({
              row: {
                ...empty,
                sort_order: (data.at(-1)?.sort_order ?? 0) + 1,
              },
              isNew: true,
            })
          }
          className="flex min-h-11 items-center gap-2 rounded-full bg-sage px-5 text-sm font-semibold text-sage-foreground"
        >
          <Plus className="h-4 w-4" /> Nuovo piatto
        </button>
      </div>

      {categories.map((c) => (
        <section key={c.id} className="mb-8">
          <h2 className="mb-3 font-display text-lg italic text-title">
            {c.label.it}
          </h2>

          <ul className="divide-y divide-border/30 rounded-lg border border-border/30 bg-card/60">
            {data
              .filter((r) => r.category === c.id)
              .map((r) => (
                <li
                  key={r.id}
                  className={cn(
                    "flex items-center gap-3 p-3",
                    !r.visible && "opacity-50",
                  )}
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-surface-low">
                    {r.image && (
                      <img
                        src={photoUrl(r.image)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-title">{r.name_it}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatPrice(Number(r.price), "it")}
                      {!r.visible && " · Nascosto"}
                    </p>
                  </div>

                  <button
                    aria-label={r.visible ? "Nascondi dal menu" : "Mostra nel menu"}
                    title={r.visible ? "Nascondi dal menu" : "Mostra nel menu"}
                    onClick={() => toggle(r)}
                    className="grid h-10 w-10 place-items-center rounded-full border border-border/60 hover:text-sage"
                  >
                    {r.visible ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>

                  <button
                    aria-label="Modifica"
                    onClick={() => setEdit({ row: r, isNew: false })}
                    className="grid h-10 w-10 place-items-center rounded-full border border-border/60 hover:text-sage"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>

                  <button
                    aria-label="Elimina"
                    onClick={() => remove(r)}
                    className="grid h-10 w-10 place-items-center rounded-full border border-border/60 text-destructive"
                  >
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

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function DishForm({
  initial,
  isNew,
  onDone,
}: {
  initial: DishRow;
  isNew: boolean;
  onDone: () => void;
}) {
  const [r, setR] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Tracks a newly uploaded photo until the dish is saved or the form is cancelled.
  const pendingUploadPath = useRef<string | null>(null);

  const set = <K extends keyof DishRow>(k: K, v: DishRow[K]) =>
    setR((p) => ({ ...p, [k]: v }));

  const list = (v: string) =>
    v.split(",").map((s) => s.trim()).filter(Boolean);

  const opt = (v: string) => (v.trim() ? v : null);

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Seleziona un file immagine valido");
      return;
    }

    setUploading(true);

    const extensionByMime: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
      "image/avif": "avif",
    };

    const ext = extensionByMime[file.type] ?? "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, file, {
        contentType: file.type,
        upsert: false,
      });

    setUploading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    // If another new photo was uploaded but not saved, remove it to avoid orphan files.
    const previousPendingPath = pendingUploadPath.current;

    if (previousPendingPath) {
      const cleanupError = await deleteStoredPhoto(previousPendingPath);

      if (cleanupError) {
        toast.error(`Nuova foto caricata, ma non è stato possibile eliminare la foto temporanea precedente: ${cleanupError}`);
      }
    }

    pendingUploadPath.current = path;
    set("image", path);
    toast.success("Foto caricata — ricorda di salvare");
  };

  const removePhoto = async () => {
    const pendingPath = pendingUploadPath.current;

    if (pendingPath) {
      const error = await deleteStoredPhoto(pendingPath);

      if (error) {
        toast.error(`Non è stato possibile eliminare la foto caricata: ${error}`);
        return;
      }

      pendingUploadPath.current = null;
    }

    // The original photo is deleted from Storage only after the database save succeeds.
    set("image", null);
  };

  const cancel = async () => {
    if (pendingUploadPath.current) {
      const error = await deleteStoredPhoto(pendingUploadPath.current);

      if (error) {
        toast.error(`Modifiche annullate, ma non è stato possibile eliminare la foto temporanea: ${error}`);
      }

      pendingUploadPath.current = null;
    }

    onDone();
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!r.name_it.trim()) {
      toast.error("Inserisci il nome in italiano");
      return;
    }

    if (uploading) {
      toast.error("Attendi il completamento del caricamento della foto");
      return;
    }

    setBusy(true);

    const { updated_at: _u, ...payload } = {
      ...r,
      // Only a Storage path or null is ever written to the database.
      image: isStoragePath(r.image) ? r.image : null,
      id: isNew ? slug(r.name_it) || crypto.randomUUID() : r.id,
    };

    const { error } = isNew
      ? await supabase.from("dishes").insert(payload)
      : await supabase
          .from("dishes")
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq("id", r.id);

    setBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    // The new photo is now referenced by the saved database row.
    pendingUploadPath.current = null;

    // Delete the previous Storage object only after the database update succeeds.
    if (!isNew && initial.image !== r.image) {
      const cleanupError = await deleteStoredPhoto(initial.image);

      if (cleanupError) {
        toast.error(
          `Piatto salvato, ma non è stato possibile eliminare la vecchia foto: ${cleanupError}`,
        );
        onDone();
        return;
      }
    }

    toast.success("Piatto salvato");
    onDone();
  };

  const pair = (
    label: string,
    it: keyof DishRow,
    en: keyof DishRow,
    area = false,
  ) => (
    <div className="grid gap-3 sm:grid-cols-2">
      {([["IT", it], ["EN", en]] as const).map(([l, k]) => (
        <label key={l} className="block text-xs text-muted-foreground">
          {label} ({l})
          {area ? (
            <textarea
              rows={3}
              className={cn(input, "mt-1")}
              value={(r[k] as string) ?? ""}
              onChange={(e) => set(k, e.target.value as never)}
            />
          ) : (
            <input
              className={cn(input, "mt-1")}
              value={(r[k] as string) ?? ""}
              onChange={(e) =>
                set(
                  k,
                  (k.startsWith("signature") || k.startsWith("sommelier")
                    ? opt(e.target.value)
                    : e.target.value) as never,
                )
              }
            />
          )}
        </label>
      ))}
    </div>
  );

  return (
    <form onSubmit={save} className="mx-auto max-w-3xl space-y-5 px-5 py-8">
      <h1 className="font-display text-2xl text-title">
        {isNew ? "Nuovo piatto" : "Modifica piatto"}
      </h1>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-xs text-muted-foreground">
          Categoria
          <select
            className={cn(input, "mt-1")}
            value={r.category}
            onChange={(e) => set("category", e.target.value)}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label.it}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs text-muted-foreground">
          Prezzo (€)
          <input
            type="number"
            step="0.5"
            min="0"
            className={cn(input, "mt-1")}
            value={r.price}
            onChange={(e) => set("price", Number(e.target.value))}
          />
        </label>

        <label className="block text-xs text-muted-foreground">
          Ordine
          <input
            type="number"
            className={cn(input, "mt-1")}
            value={r.sort_order}
            onChange={(e) => set("sort_order", Number(e.target.value))}
          />
        </label>
      </div>

      {pair("Nome", "name_it", "name_en")}
      {pair("Etichetta", "tag_it", "tag_en")}
      {pair("Descrizione", "description_it", "description_en", true)}

      <div className="grid gap-3 sm:grid-cols-2">
        {(["it", "en"] as const).map((l) => (
          <label key={l} className="block text-xs text-muted-foreground">
            Ingredienti ({l.toUpperCase()}, separati da virgola)
            <input
              className={cn(input, "mt-1")}
              defaultValue={r[`ingredients_${l}`].join(", ")}
              onBlur={(e) =>
                set(`ingredients_${l}`, list(e.target.value))
              }
            />
          </label>
        ))}
      </div>

      <fieldset>
        <legend className="mb-2 text-xs text-muted-foreground">
          Allergeni
        </legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(allergenLabels) as AllergenId[]).map((a) => {
            const on = r.allergens.includes(a);

            return (
              <button
                type="button"
                key={a}
                onClick={() =>
                  set(
                    "allergens",
                    on
                      ? r.allergens.filter((x) => x !== a)
                      : [...r.allergens, a],
                  )
                }
                className={cn(
                  "min-h-9 rounded-full border px-3 text-xs",
                  on
                    ? "border-destructive bg-destructive/15 text-destructive"
                    : "border-border/60 text-muted-foreground",
                )}
              >
                {allergenLabels[a].it}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs text-muted-foreground">
          Diete
        </legend>
        <div className="flex flex-wrap gap-4">
          {(Object.keys(dietLabels) as DietId[]).map((k) => (
            <label
              key={k}
              className="flex items-center gap-2 text-sm text-title"
            >
              <input
                type="checkbox"
                checked={r[k]}
                onChange={(e) => set(k, e.target.checked)}
                className="h-5 w-5 accent-sage"
              />
              {dietLabels[k].it}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded bg-surface-low">
          {r.image && (
            <img
              src={photoUrl(r.image)}
              alt=""
              className="h-full w-full object-cover"
            />
          )}
        </div>

        <label
          className={cn(
            "flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-border/60 px-5 text-sm text-title",
            uploading && "opacity-60",
          )}
        >
          <Camera className="h-4 w-4" />
          {uploading ? "Caricamento…" : "Carica foto"}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={uploading || busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
        </label>

        {r.image && (
          <button
            type="button"
            disabled={uploading || busy}
            onClick={removePhoto}
            className="text-xs text-destructive disabled:opacity-50"
          >
            Rimuovi foto
          </button>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-title">
        <input
          type="checkbox"
          checked={r.visible}
          onChange={(e) => set("visible", e.target.checked)}
          className="h-5 w-5 accent-sage"
        />
        Visibile nel menu
      </label>

      <p className="text-xs text-muted-foreground">
        Le fotografie vengono archiviate permanentemente nello spazio Storage
        di Supabase. Per sostituire o rimuovere una foto, usa i comandi qui sopra.
      </p>

      <p className="border-t border-border/30 pt-4 text-xs uppercase tracking-widest text-muted-foreground">
        Piatto iconico (facoltativo)
      </p>

      {pair("Nota", "signature_note_it", "signature_note_en")}
      {pair("Abbinamento", "signature_pairing_it", "signature_pairing_en")}

      <p className="border-t border-border/30 pt-4 text-xs uppercase tracking-widest text-muted-foreground">
        Consiglio del Sommelier (facoltativo)
      </p>

      {pair("Vino / cocktail", "sommelier_wine_it", "sommelier_wine_en")}
      {pair("Nota di degustazione", "sommelier_note_it", "sommelier_note_en")}

      <div className="flex gap-3 pt-2">
        <button
          disabled={busy || uploading}
          className="min-h-11 rounded-full bg-sage px-6 text-sm font-semibold text-sage-foreground disabled:opacity-60"
        >
          Salva
        </button>

        <button
          type="button"
          disabled={busy || uploading}
          onClick={cancel}
          className="min-h-11 rounded-full border border-border/60 px-6 text-sm text-title disabled:opacity-60"
        >
          Annulla
        </button>
      </div>
    </form>
  );
}
