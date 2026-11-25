
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileUp, Pencil, Plus, Search, Trash2, UtensilsCrossed, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { allDishesQuery, type DishRow } from "@/lib/menu-api";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type MenuRow = Database["public"]["Tables"]["menus"]["Row"];
type MenuInsert = Database["public"]["Tables"]["menus"]["Insert"];

type AdminMenusProps = {
  onUploadPdf?: () => void;
};

const MENU_TYPES = [
  "Degustazione",
  "Alla Carta",
  "Bistrot & Aperitivo",
  "Special Event",
] as const;

const MENU_TIMES = [
  "Tutte le fasce orarie (Giorno + Sera)",
  "Giorno",
  "Sera",
  "Solo domenica a pranzo",
] as const;

const input =
  "box-border h-[46px] min-h-[46px] w-full rounded-xl border border-white/[0.07] bg-[#1F2C2C] px-3.5 text-base font-medium leading-normal text-[#D7E5E5] placeholder:text-[#B5CBC9]/60 outline-none transition focus:border-[#D8E9AC] focus:ring-1 focus:ring-[#D8E9AC]";

const primaryButton =
  "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full bg-[#D8E9AC] px-5 text-xs font-bold tracking-wide text-[#151F00] shadow-[0_4px_20px_rgba(216,233,172,0.18)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

const makeSlug = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const normalizeMenuTime = (value: string) => {
  if (MENU_TIMES.includes(value as (typeof MENU_TIMES)[number])) return value;

  const legacyValue = value.trim().toLocaleLowerCase("it-IT");
  if (legacyValue === "pranzo") return "Giorno";
  if (legacyValue === "cena") return "Sera";
  if (
    legacyValue === "tutte le fasce orarie (giorno + sera)"
  ) {
    return MENU_TIMES[0];
  }

  return MENU_TIMES[0];
};

const formatPrice = (price: number) =>
  new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(Number(price) || 0);

function AdminMenus({ onUploadPdf }: AdminMenusProps) {
  const qc = useQueryClient();

  const {
    data: menus = [],
    isLoading: menusLoading,
    isError: menusError,
  } = useQuery({
    queryKey: ["menus", "admin"],
    queryFn: async (): Promise<MenuRow[]> => {
      const { data, error } = await supabase
        .from("menus")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name_it", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });

  const {
    data: dishes = [],
    isLoading: dishesLoading,
    isError: dishesError,
  } = useQuery(allDishesQuery);

  const {
    data: menuDishRows = [],
    isError: countsError,
  } = useQuery({
    queryKey: ["menu-dish-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_dishes")
        .select("menu_id, dish_id");

      if (error) throw error;
      return data ?? [];
    },
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameIt, setNameIt] = useState("");
  const [menuType, setMenuType] = useState<string>("Alla Carta");
  const [menuTime, setMenuTime] = useState<string>(MENU_TIMES[0]);
  const [descriptionIt, setDescriptionIt] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedDishIds, setSelectedDishIds] = useState<string[]>([]);
  const [dishSearch, setDishSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);

  const getDishCount = (menuId: string): number | null =>
    countsError
      ? null
      : menuDishRows.filter((row) => row.menu_id === menuId).length;

  const resetForm = () => {
    setEditingId(null);
    setNameIt("");
    setMenuType("Alla Carta");
    setMenuTime(MENU_TIMES[0]);
    setDescriptionIt("");
    setIsActive(true);
    setSelectedDishIds([]);
    setDishSearch("");
    setShowForm(false);
  };

  const startNew = () => {
    resetForm();
    setShowForm(true);
  };

  const startEdit = async (menu: MenuRow) => {
    setBusy(true);

    try {
      const { data, error } = await supabase
        .from("menu_dishes")
        .select("dish_id")
        .eq("menu_id", menu.id);

      if (error) throw error;

      setEditingId(menu.id);
      setNameIt(menu.name_it);
      setMenuType(menu.type || "Alla Carta");
      setMenuTime(normalizeMenuTime(menu.time || MENU_TIMES[0]));
      setDescriptionIt(menu.description_it ?? "");
      setIsActive(menu.is_active);
      setSelectedDishIds((data ?? []).map((row) => row.dish_id));
      setShowForm(true);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? `Impossibile caricare i piatti associati: ${error.message}`
          : "Impossibile caricare i piatti associati al menù",
      );
    } finally {
      setBusy(false);
    }
  };

  const refreshMenus = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["menus"] }),
      qc.invalidateQueries({ queryKey: ["menu-dish-counts"] }),
      qc.invalidateQueries({ queryKey: ["menu-dishes"] }),
    ]);
  };

  const filteredDishes = dishes.filter((dish) => {
    const search = dishSearch.trim().toLocaleLowerCase("it-IT");
    if (!search) return true;
    return (
      dish.name_it.toLocaleLowerCase("it-IT").includes(search) ||
      String(dish.category).toLocaleLowerCase("it-IT").includes(search)
    );
  });

  const toggleDishSelection = (dishId: string) => {
    setSelectedDishIds((current) =>
      current.includes(dishId)
        ? current.filter((id) => id !== dishId)
        : [...current, dishId],
    );
  };

  const syncMenuDishes = async (
    menuId: string,
    desiredIds: string[],
    availableDishes: DishRow[],
  ) => {
    const { data: currentRows, error: readError } = await supabase
      .from("menu_dishes")
      .select("dish_id")
      .eq("menu_id", menuId);

    if (readError) throw readError;

    const currentIds = (currentRows ?? []).map((row) => row.dish_id);
    const idsToRemove = currentIds.filter((id) => !desiredIds.includes(id));
    const idsToAdd = desiredIds.filter((id) => !currentIds.includes(id));

    if (idsToAdd.length > 0) {
      const rows = idsToAdd.map((dishId) => ({
        menu_id: menuId,
        dish_id: dishId,
        sort_order:
          availableDishes.find((dish) => dish.id === dishId)?.sort_order ?? 0,
      }));

      const { error } = await supabase.from("menu_dishes").insert(rows);
      if (error) throw error;
    }

    if (idsToRemove.length > 0) {
      const { error } = await supabase
        .from("menu_dishes")
        .delete()
        .eq("menu_id", menuId)
        .in("dish_id", idsToRemove);

      if (error) throw error;
    }
  };

  const saveMenu = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = nameIt.trim();
    if (!trimmedName) {
      toast.error("Inserisci il nome del menù");
      return;
    }

    if (!MENU_TYPES.includes(menuType as (typeof MENU_TYPES)[number])) {
      toast.error("Seleziona una tipologia valida");
      return;
    }

    if (!MENU_TIMES.includes(menuTime as (typeof MENU_TIMES)[number])) {
      toast.error("Seleziona una fascia oraria valida");
      return;
    }

    const existingMenu = editingId
      ? menus.find((menu) => menu.id === editingId)
      : undefined;

    const payload: MenuInsert = {
      name_it: trimmedName,
      name_en: existingMenu?.name_en ?? trimmedName,
      description_it: descriptionIt.trim() || null,
      description_en: existingMenu?.description_en ?? null,
      slug: existingMenu?.slug || makeSlug(trimmedName),
      type: menuType,
      time: menuTime,
      sort_order: existingMenu?.sort_order ?? menus.length,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    };

    if (!payload.slug) {
      toast.error("Il nome del menù non genera un identificativo URL valido");
      return;
    }

    setBusy(true);
    let menuId = editingId;

    try {
      if (editingId) {
        const { error } = await supabase
          .from("menus")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("menus")
          .insert(payload)
          .select("id")
          .single();

        if (error) throw error;
        menuId = data.id;
      }

      if (!menuId) {
        throw new Error("ID del menù non disponibile dopo il salvataggio");
      }

      try {
        await syncMenuDishes(menuId, selectedDishIds, dishes);
      } catch (assignmentError) {
        if (!editingId) setEditingId(menuId);
        await refreshMenus();
        throw new Error(
          `Menù salvato, ma non è stato possibile aggiornare i piatti associati. ${
            assignmentError instanceof Error
              ? assignmentError.message
              : "Riprova."
          }`,
        );
      }

      toast.success(editingId ? "Menù aggiornato" : "Menù creato");
      resetForm();
      await refreshMenus();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Errore durante il salvataggio del menù",
      );
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (menu: MenuRow) => {
    setBusy(true);

    try {
      const { error } = await supabase
        .from("menus")
        .update({
          is_active: !menu.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", menu.id);

      if (error) throw error;

      toast.success(
        menu.is_active
          ? "Menù nascosto ai clienti"
          : "Menù visibile ai clienti",
      );
      await refreshMenus();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Errore durante la modifica della visibilità",
      );
    } finally {
      setBusy(false);
    }
  };

  const deleteMenu = async (menu: MenuRow) => {
    if (
      !confirm(
        `Eliminare il menù "${menu.name_it}"?\n\nI piatti non verranno eliminati.`,
      )
    ) {
      return;
    }

    setBusy(true);

    try {
      const { error: assignmentsError } = await supabase
        .from("menu_dishes")
        .delete()
        .eq("menu_id", menu.id);

      if (assignmentsError) throw assignmentsError;

      const { error } = await supabase
        .from("menus")
        .delete()
        .eq("id", menu.id);

      if (error) throw error;

      if (editingId === menu.id) resetForm();
      toast.success("Menù eliminato");
      await refreshMenus();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Errore durante l'eliminazione del menù",
      );
    } finally {
      setBusy(false);
    }
  };

  if (menusLoading) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-[#111E1E] px-5 py-12 text-center text-sm text-[#B5CBC9]">
        Caricamento menù…
      </div>
    );
  }

  if (menusError) {
    return (
      <div className="rounded-2xl border border-[#FFB4AB]/20 bg-[#111E1E] p-4 text-sm text-[#FFB4AB]">
        Non è stato possibile caricare i menù. Verifica la connessione e riprova.
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4 text-[#D7E5E5]">
      <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-[#111E1E] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-medium text-white">
            Menù del Ristorante
          </h2>
          <p className="mt-1 text-xs text-[#B5CBC9]">
            Carte tematiche, degustazioni e visibilità QR
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onUploadPdf}
            disabled={busy}
            className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-white/[0.06] bg-[#1F2C2C] px-3.5 text-xs font-semibold text-[#D8E9AC] transition hover:bg-[#2A3737] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileUp className="h-[17px] w-[17px]" />
            Carica Menù PDF
          </button>

          <button
            type="button"
            onClick={startNew}
            aria-label="Nuovo Menù"
            title="Nuovo Menù"
            disabled={busy}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#D8E9AC] text-[#151F00] shadow-[0_4px_20px_rgba(216,233,172,0.22)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      {countsError && (
        <p className="rounded-xl border border-[#FFB4AB]/20 bg-[#111E1E] p-3 text-xs text-[#FFB4AB]">
          Non è stato possibile aggiornare il conteggio dei piatti associati.
        </p>
      )}

      {menus.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#111E1E] px-5 py-12 text-center">
          <UtensilsCrossed className="mx-auto h-8 w-8 text-[#D8E9AC]" />
          <p className="mt-3 text-sm font-semibold text-white">
            Nessun menù configurato
          </p>
          <p className="mt-1 text-xs text-[#B5CBC9]">
            Crea il primo menù del ristorante per iniziare.
          </p>
          <button
            type="button"
            onClick={startNew}
            className={cn(primaryButton, "mt-5")}
          >
            <Plus className="h-4 w-4" />
            Crea Menù
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3" id="restaurant-menus-list">
          {menus.map((menu) => {
            const dishCount = getDishCount(menu.id);

            return (
              <article
                key={menu.id}
                className={cn(
                  "flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-[#152222] p-4 transition-opacity",
                  menu.is_active ? "opacity-100" : "opacity-70",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-display text-base font-semibold text-white">
                        {menu.name_it}
                      </h3>
                      <span
                        className={cn(
                          "inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                          menu.is_active
                            ? "bg-[#D8E9AC]/20 text-[#D8E9AC]"
                            : "bg-[#1F2C2C] text-[#B5CBC9]",
                        )}
                      >
                        {menu.is_active ? "Visibile Ospiti" : "Nascosto Ospiti"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#B5CBC9]">
                      {normalizeMenuTime(menu.time)} • {menu.description_it || menu.type}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => void startEdit(menu)}
                      disabled={busy}
                      aria-label={`Modifica menù ${menu.name_it}`}
                      title="Modifica Menù"
                      className="grid h-8 w-8 place-items-center rounded-full border border-white/[0.06] bg-[#1F2C2C] text-[#D8E9AC] transition hover:bg-[#2A3737] disabled:opacity-40"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteMenu(menu)}
                      disabled={busy}
                      aria-label={`Elimina menù ${menu.name_it}`}
                      title="Elimina Menù"
                      className="grid h-8 w-8 place-items-center rounded-full border border-white/[0.06] bg-[#1F2C2C] text-[#FFB4AB] transition hover:bg-[#3A2022] disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] pt-2 text-xs text-[#B5CBC9]">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="font-semibold text-white">
                      {dishCount === null
                        ? "Conteggio non disponibile"
                        : `${dishCount} ${dishCount === 1 ? "piatto associato" : "piatti associati"}`}
                    </span>
                    <span aria-hidden="true">•</span>
                    <span className="font-medium text-[#D8E9AC]">
                      {menu.type}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-[11px] font-medium text-white">
                      QR Ospiti
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={menu.is_active}
                      aria-label={
                        menu.is_active
                          ? `Nascondi ${menu.name_it} dal QR`
                          : `Mostra ${menu.name_it} nel QR`
                      }
                      disabled={busy}
                      onClick={() => void toggleActive(menu)}
                      className={cn(
                        "relative h-5 w-9 rounded-full transition disabled:opacity-40",
                        menu.is_active ? "bg-[#D8E9AC]" : "bg-[#45483D]",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 h-4 w-4 rounded-full bg-[#081616] transition-all",
                          menu.is_active ? "left-[18px]" : "left-0.5",
                        )}
                      />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* MODALE NUOVO / MODIFICA MENU */}
      {showForm && (
        <div
          className="fixed inset-0 z-[75] flex h-[100dvh] w-full flex-col overflow-hidden bg-[#081616]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-menu-modal-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) resetForm();
          }}
        >
          <form
            onSubmit={saveMenu}
            className="mx-auto flex h-full w-full max-w-lg flex-col overflow-hidden bg-[#081616]"
            aria-label={editingId ? "Modifica menù" : "Nuovo menù"}
          >
            {/* TOP BAR */}
            <header className="sticky top-0 z-20 grid shrink-0 grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 border-b border-white/[0.07] bg-[#111E1E] px-4 py-3">
              <button
                type="button"
                onClick={resetForm}
                disabled={busy}
                aria-label="Chiudi"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#1F2C2C] text-[#D7E5E5] transition hover:bg-[#2A3737] disabled:opacity-40"
              >
                <X className="h-5 w-5" />
              </button>

              <h2
                id="admin-menu-modal-title"
                className="min-w-0 text-center font-display text-lg font-semibold leading-tight text-white"
              >
                {editingId ? "Modifica Menù" : "Nuovo Menù"}
              </h2>

              <button
                type="submit"
                disabled={busy || dishesLoading || dishesError}
                className="inline-flex h-10 min-w-[76px] items-center justify-center rounded-full bg-[#D8E9AC] px-4 text-xs font-bold tracking-wide text-[#151F00] shadow-[0_4px_20px_rgba(216,233,172,0.18)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "..." : "Salva"}
              </button>
            </header>

            {/* CONTENUTO MODALE */}
            <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 pb-6 sm:p-6">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="admin-menu-name"
                  className="text-[11px] font-semibold uppercase tracking-wider text-[#D7E5E5]"
                >
                  Nome del Menù *
                </label>
                <input
                  id="admin-menu-name"
                  required
                  maxLength={120}
                  className={input}
                  value={nameIt}
                  onChange={(event) => setNameIt(event.target.value)}
                  disabled={busy}
                  placeholder="Es. Menu principale, Menu estivo..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <label
                    htmlFor="admin-menu-type"
                    className="text-[11px] font-semibold uppercase tracking-wider text-[#D7E5E5]"
                  >
                    Tipologia *
                  </label>
                  <select
                    id="admin-menu-type"
                    required
                    className={cn(input, "min-w-0 px-2")}
                    value={menuType}
                    onChange={(event) => setMenuType(event.target.value)}
                    disabled={busy}
                  >
                    {MENU_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex min-w-0 flex-col gap-1.5">
                  <label
                    htmlFor="admin-menu-time"
                    className="text-[11px] font-semibold uppercase tracking-wider text-[#D7E5E5]"
                  >
                    Fascia Oraria *
                  </label>
                  <select
                    id="admin-menu-time"
                    required
                    className={cn(input, "min-w-0 px-2")}
                    value={menuTime}
                    onChange={(event) => setMenuTime(event.target.value)}
                    disabled={busy}
                  >
                    {MENU_TIMES.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="admin-menu-description"
                  className="text-[11px] font-semibold uppercase tracking-wider text-[#D7E5E5]"
                >
                  Descrizione o Nota Prezzo
                </label>
                <input
                  id="admin-menu-description"
                  maxLength={300}
                  className={input}
                  value={descriptionIt}
                  onChange={(event) => setDescriptionIt(event.target.value)}
                  disabled={busy}
                  placeholder="Es. Percorso a 5 portate con pairing d'autore"
                />
              </div>

              <div className="flex flex-col gap-2.5 pt-1">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#D7E5E5]">
                    {editingId
                      ? "Piatti Associati al Menù"
                      : "Associa Piatti Disponibili"}
                  </label>
                  <span className="shrink-0 rounded-full bg-[#D8E9AC] px-2.5 py-1 text-[11px] font-semibold text-[#151F00]">
                    {selectedDishIds.length} {selectedDishIds.length === 1 ? "piatto selezionato" : "piatti selezionati"}
                  </span>
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B5CBC9]/70" />
                  <input
                    type="search"
                    value={dishSearch}
                    onChange={(event) => setDishSearch(event.target.value)}
                    disabled={busy || dishesLoading || !!dishesError}
                    placeholder="Cerca un piatto o una categoria..."
                    aria-label="Cerca piatti per nome o categoria"
                    className={cn(input, "pl-10")}
                  />
                </div>

                <div className="flex max-h-56 flex-col gap-2 overflow-y-auto rounded-2xl border border-white/[0.06] bg-[#111E1E] p-3">
                  {dishesLoading ? (
                    <p className="py-5 text-center text-xs text-[#B5CBC9]">
                      Caricamento piatti…
                    </p>
                  ) : dishesError ? (
                    <p className="py-5 text-center text-xs text-[#FFB4AB]">
                      Non è stato possibile caricare i piatti. Chiudi e riprova.
                    </p>
                  ) : filteredDishes.length === 0 ? (
                    <p className="py-5 text-center text-xs text-[#B5CBC9]">
                      {dishSearch.trim() ? "Nessun piatto trovato." : "Non ci sono piatti da associare."}
                    </p>
                  ) : (
                    filteredDishes.map((dish) => {
                      const checked = selectedDishIds.includes(dish.id);

                      return (
                        <label
                          key={dish.id}
                          className={cn(
                            "flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 transition-colors",
                            checked
                              ? "border-[#D8E9AC]/30 bg-[#D8E9AC]/[0.06]"
                              : "border-transparent bg-[#152222] hover:bg-[#1F2C2C]",
                          )}
                        >
                          <span className="flex min-w-0 items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleDishSelection(dish.id)}
                              disabled={busy}
                              className="h-4 w-4 shrink-0 cursor-pointer rounded accent-[#D8E9AC]"
                            />
                            <span className="truncate text-xs font-medium text-[#D7E5E5]">
                              {dish.name_it}
                            </span>
                          </span>
                          <span className="shrink-0 pl-2 text-xs font-semibold text-[#D8E9AC]">
                            {formatPrice(dish.price)}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

export { AdminMenus };
