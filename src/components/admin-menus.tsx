
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Pencil, Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { allDishesQuery, type DishRow } from "@/lib/menu-api";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type MenuRow = Database["public"]["Tables"]["menus"]["Row"];

const input =
  "w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm text-foreground focus:border-sage focus:outline-none";

const makeSlug = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function AdminMenus() {
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

  const selectedMenu = menus.find((menu) => menu.id === selectedId);

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

  const resetForm = () => {
    setEditingId(null);
    setNameIt("");
    setNameEn("");
    setDescriptionIt("");
    setDescriptionEn("");
    setSlug("");
    setSortOrder(menus.length);
    setIsActive(true);
  };

  const startNew = () => {
    resetForm();
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
  };

  const saveMenu = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nameIt.trim() || !nameEn.trim()) {
      toast.error("Inserisci il nome del menu in entrambe le lingue");
      return;
    }

    const finalSlug = makeSlug(slug || nameIt);

    if (!finalSlug) {
      toast.error("Inserisci un nome valido per il menu");
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

    toast.success(editingId ? "Menu aggiornato" : "Menu creato");
    resetForm();

    await qc.invalidateQueries({ queryKey: ["menus"] });
    await qc.invalidateQueries({ queryKey: ["menus", "admin"] });
    await qc.invalidateQueries({ queryKey: ["menus", "active"] });
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
      menu.is_active ? "Menu disattivato" : "Menu attivato",
    );

    await qc.invalidateQueries({ queryKey: ["menus"] });
    await qc.invalidateQueries({ queryKey: ["menus", "admin"] });
    await qc.invalidateQueries({ queryKey: ["menus", "active"] });
  };

  const deleteMenu = async (menu: MenuRow) => {
    if (
      !confirm(
        `Eliminare il menu "${menu.name_it}"?\n\nI piatti non verranno eliminati.`,
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

    toast.success("Menu eliminato");

    await qc.invalidateQueries({ queryKey: ["menus"] });
    await qc.invalidateQueries({ queryKey: ["menus", "admin"] });
    await qc.invalidateQueries({ queryKey: ["menus", "active"] });
    await qc.invalidateQueries({ queryKey: ["menu-assignments"] });
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

    await qc.invalidateQueries({
      queryKey: ["menu-dishes", selectedId],
    });

    toast.success(
      alreadyAssigned
        ? "Piatto rimosso dal menu"
        : "Piatto aggiunto al menu",
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
    return <p className="py-10 text-center text-muted-foreground">Caricamento menu…</p>;
  }

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-title">
            Gestione menu
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea più menu e scegli quali piatti includere in ciascuno.
          </p>
        </div>

        <button
          type="button"
          onClick={startNew}
          className="flex min-h-11 items-center gap-2 rounded-full bg-sage px-5 text-sm font-semibold text-sage-foreground"
        >
          <Plus className="h-4 w-4" />
          Nuovo menu
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-3">
          <h3 className="font-display text-lg text-title">
            Menu esistenti ({menus.length})
          </h3>

          {menus.length === 0 && (
            <p className="rounded-lg border border-border/40 p-5 text-sm text-muted-foreground">
              Non ci sono menu. Creane uno per iniziare.
            </p>
          )}

          {menus.map((menu) => (
            <div
              key={menu.id}
              className={cn(
                "rounded-lg border p-4 transition-colors",
                selectedId === menu.id
                  ? "border-sage bg-sage/5"
                  : "border-border/40 bg-card/50",
              )}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedId(menu.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block font-medium text-title">
                    {menu.name_it}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {menu.name_en}
                  </span>
                  <span
                    className={cn(
                      "mt-2 inline-block rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
                      menu.is_active
                        ? "bg-sage/15 text-sage"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {menu.is_active ? "Attivo" : "Disattivato"}
                  </span>
                  {selectedId === menu.id && (
                    <span className="ml-2 text-xs text-sage">
                      Selezionato
                    </span>
                  )}
                </button>

                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    title="Modifica menu"
                    aria-label="Modifica menu"
                    onClick={() => startEdit(menu)}
                    className="grid h-9 w-9 place-items-center rounded-full border border-border/60 hover:text-sage"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    title={menu.is_active ? "Disattiva menu" : "Attiva menu"}
                    aria-label={menu.is_active ? "Disattiva menu" : "Attiva menu"}
                    onClick={() => toggleActive(menu)}
                    className="grid h-9 w-9 place-items-center rounded-full border border-border/60 text-sm hover:text-sage"
                  >
                    {menu.is_active ? "ON" : "OFF"}
                  </button>

                  <button
                    type="button"
                    title="Elimina menu"
                    aria-label="Elimina menu"
                    onClick={() => deleteMenu(menu)}
                    className="grid h-9 w-9 place-items-center rounded-full border border-border/60 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-5">
          <form
            onSubmit={saveMenu}
            className="space-y-4 rounded-lg border border-border/40 bg-card/50 p-5"
          >
            <h3 className="font-display text-lg text-title">
              {editingId ? "Modifica menu" : "Crea un menu"}
            </h3>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs text-muted-foreground">
                Nome italiano *
                <input
                  className={cn(input, "mt-1")}
                  value={nameIt}
                  onChange={(e) => {
                    setNameIt(e.target.value);
                    if (!editingId) setSlug(makeSlug(e.target.value));
                  }}
                  placeholder="Menu principale"
                  required
                />
              </label>

              <label className="block text-xs text-muted-foreground">
                Nome inglese *
                <input
                  className={cn(input, "mt-1")}
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="Main menu"
                  required
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs text-muted-foreground">
                Descrizione italiana
                <textarea
                  rows={3}
                  className={cn(input, "mt-1")}
                  value={descriptionIt}
                  onChange={(e) => setDescriptionIt(e.target.value)}
                />
              </label>

              <label className="block text-xs text-muted-foreground">
                Descrizione inglese
                <textarea
                  rows={3}
                  className={cn(input, "mt-1")}
                  value={descriptionEn}
                  onChange={(e) => setDescriptionEn(e.target.value)}
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs text-muted-foreground">
                Identificativo URL
                <input
                  className={cn(input, "mt-1")}
                  value={slug}
                  onChange={(e) => setSlug(makeSlug(e.target.value))}
                  placeholder="menu-principale"
                  required
                />
              </label>

              <label className="block text-xs text-muted-foreground">
                Ordine
                <input
                  type="number"
                  className={cn(input, "mt-1")}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                />
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm text-title">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-5 w-5 accent-sage"
              />
              Menu attivo e visibile ai clienti
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={busy}
                className="min-h-11 rounded-full bg-sage px-6 text-sm font-semibold text-sage-foreground disabled:opacity-60"
              >
                {busy
                  ? "Salvataggio…"
                  : editingId
                    ? "Salva modifiche"
                    : "Crea menu"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="min-h-11 rounded-full border border-border/60 px-5 text-sm text-title"
                >
                  Annulla
                </button>
              )}
            </div>
          </form>

          <div className="rounded-lg border border-border/40 bg-card/50 p-5">
            <div className="mb-4 flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5 text-sage" />
              <h3 className="font-display text-lg text-title">
                Associazione piatti
              </h3>
            </div>

            {!selectedMenu ? (
              <p className="text-sm text-muted-foreground">
                Seleziona un menu dalla lista per gestire i suoi piatti.
              </p>
            ) : (
              <>
                <p className="mb-3 text-sm text-muted-foreground">
                  Selezionato: <strong className="text-title">{selectedMenu.name_it}</strong>
                </p>

                <p className="mb-4 text-xs text-muted-foreground">
                  Seleziona i piatti da includere. Lo stesso piatto può
                  appartenere a più menu.
                </p>

                <input
                  className={cn(input, "mb-3")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cerca un piatto…"
                />

                {dishesLoading || assignmentsLoading ? (
                  <p className="py-5 text-sm text-muted-foreground">
                    Caricamento piatti…
                  </p>
                ) : (
                  <>
                    <p className="mb-3 text-xs text-muted-foreground">
                      {assignments.length} piatti assegnati
                    </p>

                    <div className="max-h-[480px] space-y-1 overflow-y-auto">
                      {filteredDishes.map((dish) => {
                        const checked = assignedIds.has(dish.id);

                        return (
                          <label
                            key={dish.id}
                            className="flex cursor-pointer items-center gap-3 rounded-md border border-transparent p-2.5 transition-colors hover:border-border/50 hover:bg-background/60"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleDish(dish)}
                              className="h-5 w-5 shrink-0 accent-sage"
                            />

                            {dish.image ? (
                              <img
                                src={dish.image}
                                alt=""
                                className="h-10 w-10 shrink-0 rounded object-cover"
                              />
                            ) : (
                              <div className="grid h-10 w-10 shrink-0 place-items-center rounded bg-surface-low text-sage">
                                <UtensilsCrossed className="h-4 w-4" />
                              </div>
                            )}

                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm text-title">
                                {dish.name_it}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {dish.name_en}
                              </span>
                            </span>

                            {checked && (
                              <Check className="h-4 w-4 shrink-0 text-sage" />
                            )}
                          </label>
                        );
                      })}

                      {filteredDishes.length === 0 && (
                        <p className="py-5 text-center text-sm text-muted-foreground">
                          Nessun piatto trovato.
                        </p>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export { AdminMenus };
