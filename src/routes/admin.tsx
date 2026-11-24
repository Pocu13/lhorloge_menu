
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Eye,
  FileUp,
  LayoutGrid,
  LogOut,
  Pencil,
  Plus,
  Search,
  Trash2,
  UtensilsCrossed,
  UserRound,
  X,
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
  "w-full rounded-xl border border-white/10 bg-[#152222] px-3.5 py-3 text-sm text-[#D7E5E5] placeholder:text-[#999999] outline-none transition focus:border-[#D8E9AC] focus:ring-1 focus:ring-[#D8E9AC]";

const primaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#D8E9AC] px-5 text-xs font-bold uppercase tracking-wider text-[#081616] shadow-[0_4px_20px_rgba(216,233,172,0.18)] transition active:scale-[0.98] disabled:opacity-50";

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

type AdminTab = "dishes" | "categories" | "menus";

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

          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D8E9AC]">
            Area amministrazione
          </p>
        </div>

        <label className="block text-xs text-[#B5CBC9]">
          Email
          <input
            className={`${input} mt-1`}
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
            className={`${input} mt-1`}
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        <button disabled={busy} className={`${primaryButton} w-full`}>
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
  const [tab, setTab] = useState<AdminTab>("dishes");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

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

  const filteredDishes = useMemo(() => {
    const term = search.trim().toLowerCase();

    return data.filter((dish) => {
      const matchesCategory =
        categoryFilter === "all" || dish.category === categoryFilter;

      const searchable = [
        dish.name_it,
        dish.name_en,
        dish.description_it,
        dish.description_en,
        ...(dish.ingredients_it ?? []),
        ...(dish.ingredients_en ?? []),
      ]
        .join(" ")
        .toLowerCase();

      return matchesCategory && (!term || searchable.includes(term));
    });
  }, [data, search, categoryFilter]);

  const totalVisible = data.filter((dish) => dish.visible).length;
  const toCheck = data.filter((dish) => !dish.allergens_checked).length;

  const nextOrder =
    data.reduce(
      (highest, dish) => Math.max(highest, dish.sort_order ?? 0),
      0,
    ) + 1;

  const openNewDish = (categoryId?: string) => {
    setEdit({
      row: {
        ...empty,
        category: (categoryId || "antipasti") as DishRow["category"],
        sort_order: nextOrder,
      },
      isNew: true,
    });
  };

  const openEditDish = (dish: DishRow) => {
    setEdit({ row: dish, isNew: false });
  };

  if (importing) {
    return (
      <MenuImporter
        nextOrder={nextOrder}
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
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-[#081616]/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-2 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              to="/"
              className="truncate font-display text-xl font-semibold tracking-tight text-white"
            >
              L'Horloge
            </Link>

            <span className="shrink-0 rounded-full bg-[#1F2C2C] px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-[#D8E9AC]">
              Admin
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/"
              className="flex min-h-10 items-center gap-1.5 rounded-full bg-[#1F2C2C] px-3.5 text-xs font-semibold text-[#D8E9AC] transition hover:bg-[#2A3737]"
            >
              <UtensilsCrossed className="h-4 w-4" />
              <span>Menù Ospiti</span>
            </Link>

            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.reload();
              }}
              aria-label="Esci dall'area amministrazione"
              title="Esci"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#D8E9AC] text-[#081616] transition hover:scale-105"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 pb-16 pt-[calc(5rem+env(safe-area-inset-top))] sm:px-6">
        {/* TITOLO PAGINA */}
        <section className="flex items-end justify-between gap-2 pt-1">
          <div>
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#D8E9AC]">
              Area Riservata • Catania
            </span>

            <h1 className="font-display text-[26px] font-semibold leading-tight tracking-tight text-white sm:text-3xl">
              Gestione Menù
            </h1>
          </div>
        </section>

        {/* NAVIGAZIONE PRINCIPALE */}
        <nav
          aria-label="Sezioni amministrazione"
          className="grid grid-cols-3 gap-1 rounded-full border border-white/[0.06] bg-[#111E1E] p-1"
        >
          {(
            [
              ["dishes", "Piatti"],
              ["categories", "Categorie"],
              ["menus", "Menù"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex min-h-11 items-center justify-center rounded-full px-2 text-xs font-semibold tracking-wide transition-all",
                tab === id
                  ? "bg-[#D8E9AC] text-[#151F00] shadow-sm"
                  : "text-[#B5CBC9] hover:text-white",
              )}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* SCHEDA PIATTI */}
        {tab === "dishes" && (
          <section className="flex flex-col gap-4">
            <div className="flex w-full items-center gap-2.5">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#B5CBC9]" />

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="min-h-[46px] w-full rounded-xl border border-white/[0.07] bg-[#152222] pl-11 pr-10 text-sm text-white outline-none transition placeholder:text-[#B5CBC9]/60 focus:border-[#D8E9AC]"
                  placeholder="Cerca piatto, ingrediente..."
                  aria-label="Cerca piatto o ingrediente"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Cancella ricerca"
                    className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full bg-[#2A3737] text-[#B5CBC9]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => openNewDish()}
                aria-label="Nuovo piatto"
                title="Nuovo piatto"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#D8E9AC] text-[#081616] shadow-[0_4px_20px_rgba(216,233,172,0.22)] transition active:scale-95"
              >
                <Plus className="h-6 w-6" />
              </button>
            </div>

            {/* FILTRI CATEGORIA */}
            <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
              <button
                type="button"
                onClick={() => setCategoryFilter("all")}
                className={cn(
                  "min-h-9 shrink-0 rounded-full border px-4 text-xs font-semibold transition",
                  categoryFilter === "all"
                    ? "border-[#D8E9AC] bg-[#D8E9AC] text-[#151F00]"
                    : "border-white/[0.06] bg-[#152222] text-[#B5CBC9]",
                )}
              >
                Tutti
              </button>

              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setCategoryFilter(category.id)}
                  className={cn(
                    "min-h-9 shrink-0 rounded-full border px-4 text-xs font-semibold transition",
                    categoryFilter === category.id
                      ? "border-[#D8E9AC] bg-[#D8E9AC] text-[#151F00]"
                      : "border-white/[0.06] bg-[#152222] text-[#B5CBC9]",
                  )}
                >
                  {category.label.it
                    .replace(" & Tapas", "")
                    .replace(" & Pizze", "")
                    .replace(" & Burger", "")
                    .replace(" & Dessert", "")}
                </button>
              ))}
            </div>

            {/* RIEPILOGO */}
            <div className="flex items-center justify-between gap-3 px-1">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#B5CBC9]">
                  Elenco piatti
                </p>
                <p className="mt-0.5 font-display text-lg text-white">
                  {filteredDishes.length}{" "}
                  {filteredDishes.length === 1 ? "piatto" : "piatti"}
                </p>
              </div>

              <span className="rounded-full bg-[#1F2C2C] px-3 py-1.5 text-[10px] font-semibold text-[#D8E9AC]">
                {totalVisible} attivi
              </span>
            </div>

            {toCheck > 0 && (
              <div className="flex items-start gap-2 rounded-xl border border-[#FFB4AB]/25 bg-[#93000A]/10 p-3 text-xs text-[#FFB4AB]">
                <span className="mt-0.5">!</span>
                <p>
                  {toCheck} piatti hanno allergeni da verificare. Controllali
                  prima di renderli visibili ai clienti.
                </p>
              </div>
            )}

            {/* LISTA PIATTI */}
            {isLoading ? (
              <div className="rounded-2xl bg-[#111E1E] py-12 text-center text-sm text-[#999999]">
                Caricamento piatti…
              </div>
            ) : filteredDishes.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-[#111E1E] px-4 py-10 text-center">
                <UtensilsCrossed className="mb-3 h-8 w-8 text-[#D8E9AC]" />
                <p className="font-display text-lg text-white">
                  Nessun piatto trovato
                </p>
                <p className="mt-1 max-w-[240px] text-xs text-[#B5CBC9]">
                  Prova a modificare la ricerca o il filtro selezionato.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredDishes.map((dish) => {
                  const category = categories.find(
                    (item) => item.id === dish.category,
                  );

                  const imageUrl = dish.image
                    ? /^https?:\/\//i.test(dish.image)
                      ? dish.image
                      : supabase.storage
                          .from("dish-photos")
                          .getPublicUrl(dish.image).data.publicUrl
                    : null;

                  return (
                    <article
                      key={dish.id}
                      className={cn(
                        "flex items-center gap-3.5 rounded-2xl border border-white/[0.07] bg-[#152222] p-3.5 transition-all",
                        !dish.visible && "opacity-55",
                      )}
                    >
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/[0.06] bg-[#2A3737]">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={dish.name_it}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-[#B5CBC9]">
                            img
                          </div>
                        )}
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex items-start justify-between gap-2">
                          <h2 className="min-w-0 truncate font-display text-base font-semibold leading-snug text-white">
                            {dish.name_it}
                          </h2>

                          <div className="flex shrink-0 items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditDish(dish)}
                              aria-label={`Modifica ${dish.name_it}`}
                              title="Modifica piatto"
                              className="grid h-8 w-8 place-items-center rounded-full border border-white/[0.06] bg-[#1F2C2C] text-[#D8E9AC] transition hover:bg-[#2A3737]"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => void remove(dish)}
                              aria-label={`Elimina ${dish.name_it}`}
                              title="Elimina piatto"
                              className="grid h-8 w-8 place-items-center rounded-full border border-white/[0.06] bg-[#1F2C2C] text-[#FFB4AB] transition hover:bg-[#3A2022]"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-medium text-[#B5CBC9]">
                            {category?.label.it ?? dish.category}
                          </span>

                          {dish.tag_it && (
                            <span className="rounded-full bg-[#2A3737] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#D8E9AC]">
                              {dish.tag_it}
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex items-center justify-between gap-2">
                          <span className="font-display text-sm font-bold tracking-tight text-[#D8E9AC]">
                            {formatPrice(Number(dish.price), "it")}
                          </span>

                          <button
                            type="button"
                            onClick={() => void toggle(dish)}
                            className={cn(
                              "flex min-h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold transition",
                              dish.visible
                                ? "border-[#D8E9AC]/30 bg-[#D8E9AC]/10 text-[#D8E9AC]"
                                : "border-white/[0.06] bg-[#1F2C2C] text-[#B5CBC9]",
                            )}
                          >
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                dish.visible
                                  ? "bg-[#D8E9AC]"
                                  : "bg-[#909285]",
                              )}
                            />
                            {dish.visible ? "Attivo" : "Disattivato"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* SCHEDA CATEGORIE */}
        {tab === "categories" && (
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-[#111E1E] p-4">
              <div className="min-w-0">
                <h2 className="font-display text-lg font-medium text-white">
                  Sezioni del Menù
                </h2>
                <p className="mt-1 text-xs text-[#B5CBC9]">
                  Le categorie attualmente configurate nel menu.
                </p>
              </div>

              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#1F2C2C] text-[#D8E9AC]">
                <LayoutGrid className="h-5 w-5" />
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {categories.map((category, index) => {
                const count = data.filter(
                  (dish) => dish.category === category.id,
                ).length;

                return (
                  <article
                    key={category.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-[#152222] p-3.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/[0.06] bg-[#1F2C2C] text-xs font-bold text-[#D8E9AC]">
                        {index + 1}
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate font-display text-base font-medium text-white">
                          {category.label.it}
                        </h3>
                        <p className="mt-0.5 text-[11px] text-[#B5CBC9]">
                          {count} {count === 1 ? "piatto" : "piatti"}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setCategoryFilter(category.id);
                        setTab("dishes");
                      }}
                      aria-label={`Visualizza i piatti della categoria ${category.label.it}`}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#1F2C2C] text-[#D8E9AC] transition hover:bg-[#2A3737]"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </article>
                );
              })}
            </div>

            <p className="rounded-xl border border-[#D8E9AC]/15 bg-[#111E1E] p-3 text-[11px] leading-relaxed text-[#B5CBC9]">
              Le categorie sono attualmente definite nella configurazione
              dell'applicazione. La creazione, la modifica e il riordino
              saranno attivati dopo aver predisposto la gestione delle
              categorie nel database.
            </p>
          </section>
        )}

        {/* SCHEDA MENU */}
        {tab === "menus" && <AdminMenus />}

        {/* AZIONI SECONDARIE */}
        <section className="grid grid-cols-2 gap-2 border-t border-white/[0.06] pt-5">
          <button
            type="button"
            onClick={() => window.open("/", "_blank")}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-[#152222] px-3 text-xs font-semibold text-[#D8E9AC] transition hover:bg-[#1F2C2C]"
          >
            <Eye className="h-4 w-4" />
            Anteprima
          </button>

          <button
            type="button"
            onClick={() => setImporting(true)}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-[#152222] px-3 text-xs font-semibold text-[#D8E9AC] transition hover:bg-[#1F2C2C]"
          >
            <FileUp className="h-4 w-4" />
            Carica PDF
          </button>
        </section>

        <footer className="pb-4 pt-2 text-center">
          <p className="font-display text-sm tracking-wide text-[#B5CBC9]/60">
            L'HORLOGE
          </p>
          <p className="mt-1 text-[9px] uppercase tracking-[0.18em] text-[#B5CBC9]/40">
            Area Amministrazione
          </p>
        </footer>
      </main>
    </div>
  );
}
