
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Check,
  ChevronDown,
  ChevronUp,
  FileUp,
  Pencil,
  Plus,
  Search,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { allDishesQuery, type DishRow } from "@/lib/menu-api";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type MenuRow = Database["public"]["Tables"]["menus"]["Row"];

type AdminMenusProps = {
  onUploadPdf?: () => void;
};

const input =
  "mt-1 w-full rounded-xl border border-white/10 bg-[#132726] px-3.5 py-3 text-sm text-[#EEEEEE] placeholder:text-[#999999] outline-none transition focus:border-[#D8E9AC] focus:ring-1 focus:ring-[#D8E9AC]";

const primaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#D8E9AC] px-5 text-xs font-bold uppercase tracking-wider text-[#0B1818] transition active:scale-[0.98] disabled:opacity-50";

const secondaryButton =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#152222] px-4 text-xs font-semibold text-[#D7E5E5] transition hover:border-[#D8E9AC]";

const makeSlug = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function AdminMenus({ onUploadPdf }: AdminMenusProps) {
  const qc = useQueryClient();

  const { data: menus = [], isLoading: menusLoading } = useQuery({
    queryKey: ["menus", "admin"],
    queryFn: async (): Promise<MenuRow[]> => {
      const { data, error } = await supabase
        .from("menus")
        .select("*")
        .order("sort_order")
        .order("name_it");

      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: dishes = [], isLoading: dishesLoading } =
    useQuery(allDishesQuery);

  const { data: menuDishRows = [] } = useQuery({
    queryKey: ["menu-dish-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_dishes")
        .select("menu_id, dish_id");

      if (error) throw error;
      return data ?? [];
    },
  });

  const [selectedId, setSelectedId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [nameIt, setNameIt] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [descriptionIt, setDescriptionIt] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [slug, setSlug] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showAssignments, setShowAssignments] = useState(true);

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ["menu-assignments", selectedId],
    enabled: Boolean(selectedId),
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("menu_dishes")
        .select("dish_id")
        .eq("menu_id", selectedId);

      if (error) throw error;
      return (data ?? []).map((row) => row.dish_id);
    },
  });

  const assignedIds = new Set(assignments);

  useEffect(() => {
    if (selectedId && !menus.some((menu) => menu.id === selectedId)) {
      setSelectedId("");
    }
  }, [menus, selectedId]);

  const getDishCount = (menuId: string) =>
    menuDishRows.filter((row) => row.menu_id === menuId).length;

  const resetForm = () => {
    setEditingId(null);
    setNameIt("");
    setNameEn("");
    setDescriptionIt("");
    setDescriptionEn("");
    setSlug("");
    setSortOrder(menus.length);
    setIsActive(true);
    setShowForm(false);
  };

  const startNew = () => {
    resetForm();
    setShowForm(true);
  };

  const startEdit = (menu: MenuRow) => {
    setEditingId(menu.id);
    setNameIt(menu.name_it);
    setNameEn(menu.name_en);
    setDescriptionIt(menu.description_it ?? "");
    setDescriptionEn(menu.description_en ?? "");
    setSlug(menu.slug);
    setSortOrder(menu.sort_order);
    setIsActive(menu.is_active);
    setShowForm(true);
  };

  const refreshMenus = async () => {
    await qc.invalidateQueries({ queryKey: ["menus"] });
    await qc.invalidateQueries({ queryKey: ["menu-dish-counts"] });
    await qc.invalidateQueries({ queryKey: ["menu-assignments"] });
  };

  const saveMenu = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nameIt.trim() || !nameEn.trim()) {
      toast.error("Inserisci il nome del menù in entrambe le lingue");
      return;
    }

    const finalSlug = makeSlug(slug || nameIt);

    if (!finalSlug) {
      toast.error("Inserisci un nome valido per il menù");
      return;
    }

    setBusy(true);

    const payload = {
      name_it: nameIt.trim(),
      name_en: nameEn.trim(),
      description_it: descriptionIt.trim() || null,
      description_en: descriptionEn.trim() || null,
      slug: finalSlug,
      sort_order: sortOrder,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    };

    const result = editingId
      ? await supabase.from("menus").update(payload).eq("id", editingId)
      : await supabase.from("menus").insert(payload);

    setBusy(false);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    toast.success(editingId ? "Menù aggiornato" : "Menù creato");
    resetForm();
    await refreshMenus();
  };

  const toggleActive = async (menu: MenuRow) => {
    const { error } = await supabase
      .from("menus")
      .update({
        is_active: !menu.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", menu.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(
      menu.is_active
        ? "Menù nascosto ai clienti"
        : "Menù visibile ai clienti",
    );

    await refreshMenus();
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

    const { error: assignmentError } = await supabase
      .from("menu_dishes")
      .delete()
      .eq("menu_id", menu.id);

    if (assignmentError) {
      setBusy(false);
      toast.error(assignmentError.message);
      return;
    }

    const { error } = await supabase
      .from("menus")
      .delete()
      .eq("id", menu.id);

    setBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (selectedId === menu.id) setSelectedId("");
    if (editingId === menu.id) resetForm();

    toast.success("Menù eliminato");
    await refreshMenus();
  };

  const toggleDish = async (dish: DishRow) => {
    if (!selectedId) return;

    const alreadyAssigned = assignedIds.has(dish.id);

    if (alreadyAssigned) {
      const { error } = await supabase
        .from("menu_dishes")
        .delete()
        .eq("menu_id", selectedId)
        .eq("dish_id", dish.id);

      if (error) {
        toast.error(error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("menu_dishes").insert({
        menu_id: selectedId,
        dish_id: dish.id,
        sort_order: dish.sort_order,
      });

      if (error) {
        toast.error(error.message);
        return;
      }
    }

    await qc.invalidateQueries({
      queryKey: ["menu-assignments", selectedId],
    });
    await qc.invalidateQueries({ queryKey: ["menu-dish-counts"] });
    await qc.invalidateQueries({ queryKey: ["menu-dishes", selectedId] });

    toast.success(
      alreadyAssigned
        ? "Piatto rimosso dal menù"
        : "Piatto aggiunto al menù",
    );
  };

  const filteredDishes = dishes.filter((dish) => {
    const term = search.trim().toLowerCase();

    return (
      !term ||
      dish.name_it.toLowerCase().includes(term) ||
      dish.name_en.toLowerCase().includes(term)
    );
  });

  if (menusLoading) {
    return (
      <div className="rounded-2xl bg-[#111E1E] px-5 py-12 text-center text-sm text-[#999999]">
        Caricamento menù…
      </div>
    );
  }

  return (
    <section className="space-y-4 text-[#D7E5E5]">
      {/* Intestazione */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-[#111E1E] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-white">
            Menù del Ristorante
          </h2>
          <p className="mt-1 text-xs text-[#B5CBC9]">
            Carte tematiche, degustazioni e visibilità QR
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (onUploadPdf) {
                onUploadPdf();
              } else {
                toast.error("Collegamento all'importazione PDF da completare");
              }
            }}
            className={secondaryButton}
          >
            <FileUp className="h-4 w-4 text-[#D8E9AC]" />
            Carica Menù PDF
          </button>

          <button
            type="button"
            onClick={startNew}
            aria-label="Crea nuovo menù"
            title="Crea nuovo menù"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#D8E9AC] text-[#0B1818] transition hover:brightness-110"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Modulo nuovo menù / modifica menù */}
      {showForm && (
        <form
          onSubmit={saveMenu}
          className="space-y-4 rounded-2xl border border-[#D8E9AC]/20 bg-[#111E1E] p-4 sm:p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#D8E9AC]">
                Configurazione
              </p>
              <h3 className="mt-1 font-display text-xl text-white">
                {editingId ? "Modifica Menù" : "Nuovo Menù"}
              </h3>
            </div>

            <button
              type="button"
              onClick={resetForm}
              aria-label="Chiudi modulo"
              className="grid h-9 w-9 place-items-center rounded-full bg-[#152222] text-[#B5CBC9]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-[11px] text-[#B5CBC9]">
              Nome italiano *
              <input
                className={input}
                value={nameIt}
                onChange={(e) => {
                  setNameIt(e.target.value);
                  if (!editingId) setSlug(makeSlug(e.target.value));
                }}
                placeholder="Menu principale"
                required
              />
            </label>

            <label className="block text-[11px] text-[#B5CBC9]">
              Nome inglese *
              <input
                className={input}
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="Main menu"
                required
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-[11px] text-[#B5CBC9]">
              Descrizione italiana
              <textarea
                rows={3}
                className={input}
                value={descriptionIt}
                onChange={(e) => setDescriptionIt(e.target.value)}
              />
            </label>

            <label className="block text-[11px] text-[#B5CBC9]">
              Descrizione inglese
              <textarea
                rows={3}
                className={input}
                value={descriptionEn}
                onChange={(e) => setDescriptionEn(e.target.value)}
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-[11px] text-[#B5CBC9]">
              Identificativo URL
              <input
                className={input}
                value={slug}
                onChange={(e) => setSlug(makeSlug(e.target.value))}
                placeholder="menu-principale"
                required
              />
            </label>

            <label className="block text-[11px] text-[#B5CBC9]">
              Ordine di visualizzazione
              <input
                type="number"
                className={input}
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
              />
            </label>
          </div>

          <label className="flex items-center justify-between gap-3 rounded-xl bg-[#152222] p-3">
            <span>
              <span className="block text-xs font-semibold text-white">
                Visibile ai clienti
              </span>
              <span className="mt-1 block text-[10px] text-[#999999]">
                Attiva o nascondi questo menù nella pagina pubblica.
              </span>
            </span>

            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-5 w-5 accent-[#D8E9AC]"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={resetForm}
              className={secondaryButton}
            >
              Annulla
            </button>

            <button type="submit" disabled={busy} className={primaryButton}>
              <Check className="h-4 w-4" />
              {busy
                ? "Salvataggio…"
                : editingId
                  ? "Salva modifiche"
                  : "Crea menù"}
            </button>
          </div>
        </form>
      )}

      {/* Elenco menù */}
      {menus.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#111E1E] px-5 py-12 text-center">
          <UtensilsCrossed className="mx-auto h-8 w-8 text-[#D8E9AC]" />
          <p className="mt-3 text-sm font-semibold text-white">
            Nessun menù configurato
          </p>
          <p className="mt-1 text-xs text-[#999999]">
            Crea il primo menù del ristorante per iniziare.
          </p>
          <button
            type="button"
            onClick={startNew}
            className={cn(primaryButton, "mt-5")}
          >
            <Plus className="h-4 w-4" />
            Crea menù
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {menus.map((menu) => {
            const selected = selectedId === menu.id;
            const dishCount = getDishCount(menu.id);

            return (
              <article
                key={menu.id}
                className={cn(
                  "flex flex-col gap-3 rounded-2xl border bg-[#111E1E] p-4 transition",
                  selected
                    ? "border-[#D8E9AC]/40"
                    : "border-white/[0.06]",
                )}
              >
                {/* Titolo e stato */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-lg font-semibold text-white">
                        {menu.name_it}
                      </h3>

                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider",
                          menu.is_active
                            ? "bg-[#D8E9AC]/15 text-[#D8E9AC]"
                            : "bg-[#343B38] text-[#A5AAA5]",
                        )}
                      >
                        {menu.is_active ? "Visibile Ospiti" : "Nascosto Ospiti"}
                      </span>
                    </div>

                    <p className="mt-1 text-xs leading-5 text-[#B5CBC9]">
                      {menu.description_it || menu.name_en}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(selected ? "" : menu.id);
                      setShowAssignments(true);
                    }}
                    aria-label={
                      selected ? "Chiudi associazione piatti" : "Gestisci piatti"
                    }
                    title="Gestisci piatti"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#152222] text-[#D8E9AC]"
                  >
                    {selected ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Comandi */}
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(menu)}
                    className="grid h-8 w-8 place-items-center rounded-full bg-[#253333] text-[#D7E5E5] transition hover:bg-[#D8E9AC] hover:text-[#0B1818]"
                    aria-label="Modifica menù"
                    title="Modifica"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteMenu(menu)}
                    disabled={busy}
                    className="grid h-8 w-8 place-items-center rounded-full bg-[#253333] text-[#D7E5E5] transition hover:bg-[#5A2929] hover:text-[#FFB4AB] disabled:opacity-50"
                    aria-label="Elimina menù"
                    title="Elimina"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Informazioni e visibilità QR */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-3">
                  <div className="flex items-center gap-2 text-[11px] text-[#B5CBC9]">
                    <UtensilsCrossed className="h-3.5 w-3.5 text-[#D8E9AC]" />
                    <span>
                      {dishCount}{" "}
                      {dishCount === 1 ? "piatto associato" : "piatti associati"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleActive(menu)}
                    className="flex items-center gap-2 text-[10px] font-semibold text-[#B5CBC9]"
                    aria-label={
                      menu.is_active
                        ? "Nascondi menù ai clienti"
                        : "Mostra menù ai clienti"
                    }
                  >
                    <span
                      className={cn(
                        "relative h-5 w-9 rounded-full transition",
                        menu.is_active ? "bg-[#D8E9AC]" : "bg-[#45483D]",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 h-4 w-4 rounded-full bg-[#0B1818] transition-all",
                          menu.is_active ? "left-[18px]" : "left-0.5",
                        )}
                      />
                    </span>
                    QR Ospiti
                  </button>
                </div>

                {/* Associazione piatti */}
                {selected && (
                  <div className="border-t border-white/[0.07] pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAssignments((value) => !value)}
                      className="flex w-full items-center justify-between gap-3 text-left"
                    >
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#D8E9AC]">
                          Composizione
                        </p>
                        <h4 className="mt-1 font-display text-base text-white">
                          Associazione piatti
                        </h4>
                      </div>

                      {showAssignments ? (
                        <ChevronUp className="h-4 w-4 text-[#D8E9AC]" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-[#D8E9AC]" />
                      )}
                    </button>

                    {showAssignments && (
                      <div className="mt-4">
                        <p className="mb-3 text-xs leading-5 text-[#999999]">
                          Seleziona i piatti da includere in questo menù.
                          Uno stesso piatto può appartenere a più menù.
                        </p>

                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999999]" />
                          <input
                            className={cn(input, "pl-10")}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cerca un piatto…"
                          />
                        </div>

                        {dishesLoading || assignmentsLoading ? (
                          <p className="py-6 text-center text-xs text-[#999999]">
                            Caricamento piatti…
                          </p>
                        ) : (
                          <>
                            <div className="my-3 flex items-center justify-between">
                              <span className="text-[10px] text-[#999999]">
                                Piatti selezionati
                              </span>
                              <span className="rounded-full bg-[#D8E9AC]/10 px-3 py-1 text-[10px] font-bold text-[#D8E9AC]">
                                {assignments.length}
                              </span>
                            </div>

                            <div className="max-h-[460px] space-y-2 overflow-y-auto pr-1">
                              {filteredDishes.map((dish) => {
                                const checked = assignedIds.has(dish.id);

                                return (
                                  <label
                                    key={dish.id}
                                    className={cn(
                                      "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition",
                                      checked
                                        ? "border-[#D8E9AC]/40 bg-[#D8E9AC]/[0.06]"
                                        : "border-white/[0.06] bg-[#152222] hover:border-white/20",
                                    )}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleDish(dish)}
                                      className="h-4 w-4 shrink-0 accent-[#D8E9AC]"
                                    />

                                    {dish.image ? (
                                      <img
                                        src={dish.image}
                                        alt=""
                                        className="h-12 w-12 shrink-0 rounded-lg object-cover"
                                      />
                                    ) : (
                                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-[#253333] text-[#D8E9AC]">
                                        <UtensilsCrossed className="h-4 w-4" />
                                      </div>
                                    )}

                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate text-xs font-semibold text-white">
                                        {dish.name_it}
                                      </span>
                                      <span className="mt-1 block truncate text-[10px] text-[#999999]">
                                        {dish.name_en}
                                      </span>
                                    </span>

                                    {checked && (
                                      <Check className="h-4 w-4 shrink-0 text-[#D8E9AC]" />
                                    )}
                                  </label>
                                );
                              })}

                              {filteredDishes.length === 0 && (
                                <p className="py-6 text-center text-xs text-[#999999]">
                                  Nessun piatto trovato.
                                </p>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export { AdminMenus };
