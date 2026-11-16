
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { CategoryId, DietId, Dish, T } from "@/lib/menu-data";

export type DishRow = Database["public"]["Tables"]["dishes"]["Row"];
export type MenuRow = Database["public"]["Tables"]["menus"]["Row"];
export type MenuDishRow = Database["public"]["Tables"]["menu_dishes"]["Row"];

/**
 * Converts the image value stored in the database into a URL usable by the UI.
 *
 * New records store only the permanent Storage object path.
 * Existing absolute URLs are preserved for backward compatibility.
 */
function resolveDishImage(image: string | null): string | undefined {
  if (!image?.trim()) return undefined;

  const value = image.trim();

  // Backward compatibility for existing records containing an absolute URL.
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  // Storage paths are resolved to permanent public URLs.
  const { data } = supabase.storage
    .from("dish-photos")
    .getPublicUrl(value);

  return data.publicUrl;
}

export function rowToDish(
  r: DishRow,
): Dish & { diets: DietId[]; sommelier?: { wine: T; note: T } } {
  const diets = (
    ["is_vegetarian", "is_vegan", "is_gluten_free"] as DietId[]
  ).filter((k) => r[k]);

  return {
    diets,
    sommelier:
      r.sommelier_wine_it?.trim() || r.sommelier_wine_en?.trim()
        ? {
            wine: {
              it: r.sommelier_wine_it || r.sommelier_wine_en || "",
              en: r.sommelier_wine_en || r.sommelier_wine_it || "",
            },
            note: {
              it: r.sommelier_note_it || r.sommelier_note_en || "",
              en: r.sommelier_note_en || r.sommelier_note_it || "",
            },
          }
        : undefined,
    id: r.id,
    category: r.category as CategoryId,
    name: { it: r.name_it, en: r.name_en },
    tag: { it: r.tag_it, en: r.tag_en },
    description: { it: r.description_it, en: r.description_en },
    ingredients: { it: r.ingredients_it, en: r.ingredients_en },
    allergens: r.allergens,
    price: Number(r.price),
    image: resolveDishImage(r.image),
    signature: r.signature_note_it
      ? {
          note: {
            it: r.signature_note_it,
            en: r.signature_note_en ?? "",
          },
          pairing: {
            it: r.signature_pairing_it ?? "",
            en: r.signature_pairing_en ?? "",
          },
        }
      : undefined,
  };
}

/** Public list of active menus. */
export const activeMenusQuery = queryOptions({
  queryKey: ["menus", "active"],
  queryFn: async (): Promise<MenuRow[]> => {
    const { data, error } = await supabase
      .from("menus")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .order("name_it");

    if (error) throw error;
    return data ?? [];
  },
});

/** Admin list: all menus, including inactive ones. */
export const allMenusQuery = queryOptions({
  queryKey: ["menus", "all"],
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

/**
 * Public menu: only visible dishes assigned to the selected menu.
 * The order configured in menu_dishes is preserved.
 */
export const menuDishesQuery = (menuId: string) =>
  queryOptions({
    queryKey: ["menu-dishes", menuId],
    enabled: Boolean(menuId),
    queryFn: async (): Promise<DishRow[]> => {
      if (!menuId) return [];

      const { data: assignments, error: assignmentsError } = await supabase
        .from("menu_dishes")
        .select("dish_id, sort_order")
        .eq("menu_id", menuId)
        .order("sort_order");

      if (assignmentsError) throw assignmentsError;

      if (!assignments?.length) return [];

      const dishIds = assignments.map((assignment) => assignment.dish_id);

      const { data: dishes, error: dishesError } = await supabase
        .from("dishes")
        .select("*")
        .in("id", dishIds)
        .eq("visible", true);

      if (dishesError) throw dishesError;

      const dishesById = new Map(
        (dishes ?? []).map((dish) => [dish.id, dish]),
      );

      return assignments
        .map((assignment) => dishesById.get(assignment.dish_id))
        .filter((dish): dish is DishRow => Boolean(dish));
    },
  });

/** Public menu fallback: all dishes marked visible. */
export const dishesQuery = queryOptions({
  queryKey: ["dishes", "public"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("dishes")
      .select("*")
      .eq("visible", true)
      .order("sort_order");

    if (error) throw error;
    return data;
  },
});

/** Admin list: every dish, hidden ones included. */
export const allDishesQuery = queryOptions({
  queryKey: ["dishes", "all"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("dishes")
      .select("*")
      .order("sort_order");

    if (error) throw error;
    return data;
  },
});
