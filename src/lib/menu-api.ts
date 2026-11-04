import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { CategoryId, DietId, Dish, T } from "@/lib/menu-data";

export type DishRow = Database["public"]["Tables"]["dishes"]["Row"];

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

/** Public menu: only dishes marked visible. */
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
