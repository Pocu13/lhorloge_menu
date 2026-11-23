import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Eye,
  FileUp,
  LogOut,
  Pencil,
  Plus,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";

import { MenuImporter } from "../lib/menu-importer";
import { supabase } from "@/integrations/supabase/client";
import { allDishesQuery, type DishRow } from "@/lib/menu-api";
import { categories, formatPrice } from "@/lib/menu-data";
import { AdminMenus } from "@/components/admin-menus";
import { DishEditor } from "@/components/dish-editor";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Gestione Menù — L'Horloge" },
      {
        name: "description",
        content: "Gestione dei piatti e dei menu di L'Horloge.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const input =
  "mt-1 w-full rounded-xl border border-white/10 bg-[#152222] px-3.5 py-3 text-sm text-[#EEEEEE] placeholder:text-[#999999] outline-none transition focus:border-[#D8E9AC] focus:ring-1 focus:ring-[#D8E9AC]";

const primaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#D8E9AC] px-5 text-xs font-bold uppercase tracking-wider text-[#0B1818] shadow-[0_4px_20px_rgba(216,233,172,0.16)] transition active:scale-[0.98] disabled:opacity-50";

const secondaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/[0.07] bg-[#1F2C2C] px-4 text-xs font-semibold uppercase tracking-wider text-[#D7E5E5] transition hover:border-[#D8E9AC]/40";

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

function AdminPage() {
  const [state, setState] = useState<"loading" | "out" | "in">("loading");

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      const { data } = await supabase.auth.getSession();

      if (mounted) {
        setState(data.session?.user ? "in" : "out");
      }
    };

    void check();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        if (event === "SIGNED_IN" && session) setState("in");
        if (event === "SIGNED_OUT") setState("out");
      },
    );

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#081616] text-[#D8E9AC]">
        Caricamento…
      </div>
    );
  }

  if (state === "out") return <Login />;

  return <Editor />;
}

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

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    setBusy(false);

    if (error) {
      toast.error("Credenziali non valide: " + error.message);
      return;
    }

    toast.success("Accesso effettuato");
    window.location.reload();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#081616] px-5">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-6 rounded-2xl border border-white/[0.08] bg-[#111E1E] p-7"
      >
        <div className="text-center">
          <img
            src="/logo.png"
            alt="L'Horloge"
            className="mx-auto mb-4 h-16 w-16 object-contain"
          />

          <h1 className="font-display text-3xl text-white">
            L'Horloge
          </h1>

          <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-[#D8E9AC]">
            Area amministrazione
          </p>
        </div>

        <label className="block text-xs text-[#B5CBC9]">
          Email
          <input
            className={input}
            value={user}
            onChange={(e) => setUser(e.target.value)}
            autoComplete="email"
            placeholder="admin@lhorloge.it"
          />
        </label>

        <label className="block text-xs text-[#B5CBC9]">
          Password
          <input
            type="password"
            className={input}
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        <button
          disabled={busy}
          className={cn(primaryButton, "w-full")}
        >
          {busy ? "Accesso…" : "Accedi"}
        </button>
      </form>
    </main>
  );
}

function Editor() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery(allDishesQuery);

  const [edit, setEdit] = useState<{
    row: DishRow;
    isNew: boolean;
  } | null>(null);

  const [importing, setImporting] = useState(false);
  const [section, setSection] = useState<"dishes" | "menus">("dishes");

  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    Object.fromEntries(categories.map((c) => [c.id, true])),
  );

  const remove = async (r: DishRow): Promise<boolean> => {
    if (!confirm(`Eliminare definitivamente "${r.name_it}"?`)) {
      return false;
    }

    const { error } = await supabase
      .from("dishes")
      .delete()
      .eq("id", r.id);

    if (error) {
      toast.error(error.message);
      return false;
    }

    toast.success("Piatto eliminato");
    await qc.invalidateQueries({ queryKey: ["dishes"] });

    return true;
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
      r.visible
        ? "Piatto nascosto dal menu"
        : "Piatto nuovamente visibile",
    );

    await qc.invalidateQueries({ queryKey: ["dishes"] });
  };

  const toggleSection = (id: string) => {
    setExpanded((current) => ({
      ...current,
      [id]: !current[id],
    }));
  };

  const toggleAll = () => {
    const allOpen = categories.every((c) => expanded[c.id]);

    setExpanded(
      Object.fromEntries(categories.map((c) => [c.id, !allOpen])),
    );
  };

  const totalVisible = data.filter((r) => r.visible).length;
  const toCheck = data.filter((r) => !r.allergens_checked).length;
  const allOpen = categories.every((c) => expanded[c.id]);

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
      <DishEditor
        initial={edit.row}
        isNew={edit.isNew}
        onDone={() => {
          setEdit(null);
          qc.invalidateQueries({ queryKey: ["dishes"] });
        }}
        onDelete={async () => {
          const deleted = await remove(edit.row);
          if (deleted) setEdit(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#081616] font-body text-[#D7E5E5]">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#081616]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <img
              src="/logo.png"
              alt="L'Horloge"
              className="h-9 w-9 shrink-0 object-contain"
            />

            <span className="font-display text-xl text-white">
              L'horloge
            </span>
          </Link>

          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.reload();
            }}
            aria-label="Esci"
            title="Esci"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#D8E9AC] text-[#0B1818] transition hover:scale-105"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-4 sm:px-6 sm:pt-6">
        {/* AZIONI PRINCIPALI */}
        <div className="mb-8 grid grid-cols-2 gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => window.open("/", "_blank")}
            className={secondaryButton}
          >
            <Eye className="h-4 w-4 shrink-0 text-[#B5CBC9]" />
            Anteprima
          </button>

          <button
            type="button"
            onClick={() => setImporting(true)}
            className={secondaryButton}
          >
            <FileUp className="h-4 w-4 shrink-0 text-[#D8E9AC]" />
            Carica PDF
          </button>
        </div>

        {/* TIPI MENU */}
        <section className="mb-8">
          <h2 className="mb-5 font-display text-2xl font-semibold text-white">
            Tipi Menù
          </h2>

          <div className="rounded-2xl border border-white/[0.04] bg-[#111E1E] p-4 sm:p-5">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#081616] p-1">
              <button
                type="button"
                onClick={() => setSection("dishes")}
                className={cn(
                  "min-h-11 rounded-full px-2 text-[10px] font-bold uppercase tracking-wider transition sm:text-xs",
                  section === "dishes"
                    ? "bg-[#D8E9AC] text-[#0B1818]"
                    : "text-[#B5CBC9] hover:bg-[#152222]",
                )}
              >
                Degustazione a Portate
              </button>

              <button
                type="button"
                onClick={() => setSection("menus")}
                className={cn(
                  "min-h-11 rounded-full px-2 text-[10px] font-bold uppercase tracking-wider transition sm:text-xs",
                  section === "menus"
                    ? "bg-[#D8E9AC] text-[#0B1818]"
                    : "text-[#B5CBC9] hover:bg-[#152222]",
                )}
              >
                Gestione Altri Menù
              </button>
            </div>

            {section === "dishes" && (
              <div className="mt-5">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#B5CBC9]">
                  Riepilogo disponibilità
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[#152222] p-3">
                    <p className="text-xs text-[#999999]">
                      Piatti totali
                    </p>

                    <p className="mt-1 font-display text-2xl text-white">
                      {data.length}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#152222] p-3">
                    <p className="text-xs text-[#999999]">
                      Visibili ai clienti
                    </p>

                    <p className="mt-1 font-display text-2xl text-[#D8E9AC]">
                      {totalVisible}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
                {/* GESTIONE ALTRI MENU */}
        {section === "menus" ? (
          <AdminMenus />
        ) : (
          <>
            {/* TITOLO SEZIONE */}
            <section className="mb-7">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
                    Degustazione a Portate
                  </h1>

                  <p className="mt-1 text-xs leading-5 text-[#B5CBC9]">
                    Gestisci le sezioni e i piatti del percorso.
                  </p>
                </div>

                <span className="shrink-0 rounded-full bg-[#1F2C2C] px-3 py-1.5 text-[10px] font-bold text-[#D8E9AC]">
                  {data.length} Piatti
                </span>
              </div>

              <div className="mt-7 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={toggleAll}
                  className="inline-flex min-h-9 items-center gap-2 rounded-full bg-[#152222] px-4 text-[10px] font-bold uppercase tracking-wider text-[#D8E9AC] transition hover:bg-[#1F2C2C]"
                >
                  {allOpen ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}

                  {allOpen ? "Comprimi tutto" : "Espandi tutto"}
                </button>

                <span className="rounded-full bg-[#1F2C2C] px-3 py-2 text-[10px] font-semibold text-[#D8E9AC]">
                  {totalVisible} disponibili
                </span>
              </div>
            </section>

            {/* AVVISO ALLERGENI */}
            {toCheck > 0 && (
              <div className="mb-5 flex items-start gap-2 rounded-xl border border-[#FFB4AB]/30 bg-[#93000A]/10 p-3 text-xs text-[#FFB4AB]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

                <p>
                  {toCheck} piatti hanno allergeni da verificare.
                  Controllali prima di renderli visibili ai clienti.
                </p>
              </div>
            )}

            {/* CATEGORIE E PIATTI */}
            {isLoading ? (
              <div className="rounded-2xl bg-[#111E1E] py-12 text-center text-sm text-[#999999]">
                Caricamento piatti…
              </div>
            ) : (
              <div className="space-y-4">
                {categories.map((category) => {
                  const dishes = data.filter(
                    (r) => r.category === category.id,
                  );

                  const isExpanded = expanded[category.id] ?? true;

                  return (
                    <section
                      key={category.id}
                      className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111E1E]"
                    >
                      {/* INTESTAZIONE CATEGORIA */}
                      <div className="flex items-center gap-2 px-3 py-3.5 sm:px-4">
                        <button
                          type="button"
                          onClick={() => toggleSection(category.id)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#152222] text-[#D8E9AC]">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronUp className="h-4 w-4" />
                            )}
                          </span>

                          <span className="truncate font-display text-base font-semibold text-white">
                            {category.label.it}
                          </span>

                          <span className="shrink-0 rounded-full bg-[#152222] px-2.5 py-1 text-[9px] uppercase tracking-wider text-[#B5CBC9]">
                            {dishes.length}{" "}
                            {dishes.length === 1 ? "piatto" : "piatti"}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setEdit({
                              row: {
                                ...empty,
                                category: category.id,
                                sort_order:
                                  (data.at(-1)?.sort_order ?? 0) + 1,
                              },
                              isNew: true,
                            })
                          }
                          aria-label={`Aggiungi piatto a ${category.label.it}`}
                          title="Aggiungi piatto"
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 text-[#D8E9AC] transition hover:border-[#D8E9AC] hover:bg-[#152222]"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      {/* CONTENUTO CATEGORIA */}
                      {isExpanded && (
                        <div className="space-y-3 px-3 pb-3 sm:px-4">
                          {dishes.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-white/10 px-4 py-7 text-center text-xs text-[#999999]">
                              Nessun piatto inserito in questa sezione.
                            </div>
                          ) : (
                            dishes.map((r) => (
                              <article
                                key={r.id}
                                className={cn(
                                  "rounded-2xl border border-white/[0.07] bg-[#152222] p-3.5 transition",
                                  !r.visible && "opacity-55",
                                )}
                              >
                                {/* INFORMAZIONI PIATTO */}
                                <div className="flex min-w-0 gap-3">
                                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#2A3737] sm:h-24 sm:w-24">
                                    {r.image ? (
                                      <img
                                        src={
                                          /^https?:\/\//i.test(r.image)
                                            ? r.image
                                            : supabase.storage
                                                .from("dish-photos")
                                                .getPublicUrl(r.image).data
                                                .publicUrl
                                        }
                                        alt={r.name_it}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-full flex-col items-center justify-center gap-1 text-[#999999]">
                                        <UtensilsCrossed className="h-5 w-5" />
                                        <span className="text-[9px]">
                                          img
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <h3 className="font-display text-[15px] font-semibold leading-snug text-white sm:text-base">
                                      {r.name_it}
                                    </h3>

                                    <p className="mt-1 font-display text-sm font-bold tabular-nums text-[#D8E9AC]">
                                      {formatPrice(Number(r.price), "it")}
                                    </p>

                                    <p className="mt-1 line-clamp-2 text-[11px] leading-[1.55] text-[#B5CBC9]">
                                      {r.description_it}
                                    </p>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        window.open(
                                          `/piatto/${r.id}`,
                                          "_blank",
                                        )
                                      }
                                      className="mt-1 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#D8E9AC]"
                                    >
                                      Dettagli
                                      <ArrowLeft className="h-3 w-3 rotate-180" />
                                    </button>
                                  </div>
                                </div>

                                {/* AZIONI PIATTO */}
                                <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
                                  <button
                                    type="button"
                                    onClick={() => toggle(r)}
                                    className="flex min-h-8 min-w-0 items-center gap-2 text-[10px] text-[#D7E5E5]"
                                  >
                                    <span
                                      className={cn(
                                        "relative h-5 w-9 shrink-0 rounded-full transition",
                                        r.visible
                                          ? "bg-[#D8E9AC]"
                                          : "bg-[#45483D]",
                                      )}
                                    >
                                      <span
                                        className={cn(
                                          "absolute top-0.5 h-4 w-4 rounded-full bg-[#0B1818] transition-all",
                                          r.visible
                                            ? "left-[18px]"
                                            : "left-0.5",
                                        )}
                                      />
                                    </span>

                                    <span className="truncate">
                                      Disponibile al servizio
                                    </span>
                                  </button>

                                  <div className="flex shrink-0 items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEdit({ row: r, isNew: false })
                                      }
                                      aria-label="Modifica piatto"
                                      title="Modifica piatto"
                                      className="grid h-9 w-9 place-items-center rounded-xl bg-[#1F2C2C] text-[#B5CBC9] transition hover:text-[#D8E9AC]"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => void remove(r)}
                                      aria-label="Elimina piatto"
                                      title="Elimina piatto"
                                      className="grid h-9 w-9 place-items-center rounded-xl text-[#B5CBC9] transition hover:bg-[#3A2022] hover:text-[#FFB4AB]"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>

                                {!r.allergens_checked && (
                                  <p className="mt-2 text-[10px] text-[#FFB4AB]">
                                    Allergeni da verificare
                                  </p>
                                )}
                              </article>
                            ))
                          )}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
                        {/* NUOVA CATEGORIA */}
            <button
              type="button"
              onClick={() =>
                toast.info(
                  "La creazione di nuove categorie richiede prima l'aggiornamento del database. La realizzeremo nella fase successiva.",
                )
              }
              className={cn(
                primaryButton,
                "mt-8 min-h-12 w-full rounded-xl",
              )}
            >
              <Plus className="h-4 w-4" />
              Nuova categoria
            </button>
          </>
        )}
      </main>
    </div>
  );
}
