import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Leaf,
  Sprout,
  WheatOff,
  Quote,
  Utensils,
  Wine,
} from "lucide-react";

import {
  allergenLabels,
  allergenUi,
  categories,
  dietLabels,
  formatPrice,
  type AllergenId,
  type DietId,
} from "@/lib/menu-data";

import { dishesQuery, rowToDish } from "@/lib/menu-api";
import { useLang } from "@/components/menu-ui";

export const Route = createFileRoute("/piatto/$id")({
  loader: async ({ context, params }) => {
    const rows = await context.queryClient.ensureQueryData(dishesQuery);
    const row = rows.find((r) => r.id === params.id);

    if (!row) throw notFound();

    return {
      name: row.name_it,
      description: row.description_it,
    };
  },

  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.name} — L'Horloge, Catania` },
          { name: "description", content: loaderData.description },
          { property: "og:title", content: `${loaderData.name} — L'Horloge` },
          { property: "og:description", content: loaderData.description },
          { property: "og:type", content: "article" },
          { name: "twitter:card", content: "summary_large_image" },
        ]
      : [
          { title: "Piatto non disponibile — L'Horloge" },
          { name: "robots", content: "noindex" },
        ],
  }),

  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-[#081616] px-6 text-center text-[#D7E5E5]">
      <div>
        <p className="font-display text-2xl text-white">
          Piatto non trovato · Dish not found
        </p>

        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 text-sm text-[#D8E9AC] underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Menu
        </Link>
      </div>
    </div>
  ),

  component: DishPage,
});

function DishPage() {
  const { lang } = useLang();
  const router = useRouter();
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(dishesQuery);

  const row = data.find((r) => r.id === id);

  if (!row) return null;

  const d = rowToDish(row);
  const category = categories.find((c) => c.id === d.category);

  const back = () => {
    if (window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: "/" });
    }
  };

  const diets = d.diets ?? [];
  const allergens = d.allergens ?? [];
  const ingredients = d.ingredients[lang] ?? [];

  const dietIcons: Record<DietId, typeof Leaf> = {
    is_vegetarian: Leaf,
    is_vegan: Sprout,
    is_gluten_free: WheatOff,
  };

  const labels = {
    detail: lang === "it" ? "Dettaglio Piatto" : "Dish Details",
    back: lang === "it" ? "Torna al menu" : "Back to menu",
    kitchenThought:
      lang === "it" ? "Pensiero di Cucina" : "Kitchen Notes",
    ingredients: lang === "it" ? "Ingredienti" : "Ingredients",
    allergens: lang === "it" ? "Allergeni & Intolleranze" : "Allergens & Intolerances",
    regulation: "REG. UE 1169/11",
    cellar:
      lang === "it"
        ? "Dalla Cantina de L'Horloge"
        : "From L'Horloge Cellar",
    recommendedWine:
      lang === "it" ? "Vino Consigliato" : "Recommended Wine",
    noIngredients:
      lang === "it"
        ? "Ingredienti non disponibili."
        : "Ingredients not available.",
    noAllergens: allergenUi.none[lang],
    allergensNote: allergenUi.note[lang],
  };

  const wineName =
    d.sommelier?.wine[lang] || d.signature?.pairing[lang] || "";

  const wineNote = d.sommelier?.note[lang] || "";

  return (
    <div className="min-h-screen bg-[#081616] font-sans text-[#D7E5E5] antialiased">

      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col overflow-hidden border-x border-[#2a3737]/60 bg-[#081616] shadow-2xl">

        {/* HEADER */}

        <header className="sticky top-0 z-30 flex h-[60px] shrink-0 items-center justify-between border-b border-[#2a3737]/60 bg-[#081616]/95 px-3 backdrop-blur-xl">

          <div className="flex min-w-0 items-center gap-2">

            <button
              type="button"
              onClick={back}
              aria-label={labels.back}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#D7E5E5] transition-colors hover:bg-[#152222] hover:text-[#D8E9AC]"
            >
              <ArrowLeft className="h-[22px] w-[22px]" />
            </button>

            <div className="flex min-w-0 items-center gap-2">
              <span className="h-1 w-1 shrink-0 rounded-full bg-[#45483d]" />

              <h1 className="truncate font-display text-base font-medium tracking-tight text-white">
                {labels.detail}
              </h1>
            </div>

          </div>

          <div className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1f2c2c]">
            <Utensils className="h-[17px] w-[17px] text-[#D8E9AC]" />
          </div>

        </header>

        {/* CONTENUTO SCORREVOLE */}

        <div className="flex-1 pb-12">

          {/* IMMAGINE PRINCIPALE */}

          <section className="relative w-full overflow-hidden bg-[#041010]">

            <div className="relative aspect-[4/3] max-h-[380px] w-full">

              {d.image ? (
                <img
                  src={d.image}
                  alt={d.name[lang]}
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-[#041010]">
                  <Utensils className="h-16 w-16 text-[#D8E9AC]/40" />
                </div>
              )}

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#081616] via-transparent to-transparent opacity-60" />

            </div>

          </section>

          {/* BADGE E CARATTERISTICHE */}

          <section className="flex flex-wrap items-center gap-2 bg-[#111e1e] px-5 pb-3 pt-3.5">

            {d.tag[lang] && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1f2c2c] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#D8E9AC] shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[#D8E9AC]" />
                {d.tag[lang]}
              </span>
            )}

            {diets.map((diet) => {
              const Icon = dietIcons[diet];

              return (
                <span
                  key={diet}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#152222] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-[#D7E5E5]"
                >
                  <Icon className="h-[13px] w-[13px] text-[#D8E9AC]" />
                  {dietLabels[diet][lang]}
                </span>
              );
            })}

          </section>

          {/* TITOLO, CATEGORIA E PREZZO */}

          <section className="flex flex-col gap-3 px-5 pb-3 pt-4">

            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.15em] text-[#D8E9AC]">
              {category?.label[lang]}
            </p>

            <div className="flex items-start justify-between gap-4">

              <div className="min-w-0 flex-1">

                <h2 className="font-display text-3xl font-medium leading-tight tracking-tight text-white">
                  {d.name[lang]}
                </h2>

              </div>

              <div className="shrink-0 pt-1 text-right">
                <span className="block whitespace-nowrap font-display text-2xl font-bold text-[#D8E9AC]">
                  {formatPrice(d.price, lang)}
                </span>
              </div>

            </div>

          </section>

          {/* RACCONTO DEL PIATTO */}

          {d.description[lang] && (
            <section className="px-5 pb-2 pt-3">

              <div className="mt-1 flex flex-col gap-4 rounded-2xl border border-[#2a3737]/60 bg-[#041010]/80 p-5 shadow-sm sm:p-6">

                <p className="font-display text-sm font-normal leading-relaxed text-[#D7E5E5] sm:text-base">
                  {d.description[lang]}
                </p>

                {d.signature?.note[lang] && (
                  <div className="relative rounded-xl border border-[#2a3737]/50 bg-[#111e1e]/90 p-4">

                    <div className="flex items-start gap-3">

                      <Quote className="mt-0.5 h-6 w-6 shrink-0 text-[#D8E9AC]" />

                      <div className="min-w-0 flex-1">

                        <p className="font-display text-sm italic leading-relaxed text-[#D7E5E5]">
                          {d.signature.note[lang]}
                        </p>

                        <p className="mt-3 border-t border-[#2a3737]/60 pt-2.5 text-[10px] font-semibold uppercase tracking-widest text-[#D8E9AC]">
                          {labels.kitchenThought}
                        </p>

                      </div>

                    </div>

                  </div>
                )}

              </div>

            </section>
          )}

          {/* INGREDIENTI */}

          <section className="px-5 py-3">

            <div className="rounded-2xl border border-[#2a3737]/60 bg-[#152222] p-5 shadow-sm">

              <div className="mb-2 flex items-center justify-between border-b border-[#2a3737]/60 pb-3.5">

                <h3 className="font-display text-lg font-medium tracking-tight text-white">
                  {labels.ingredients}
                </h3>

              </div>

              {ingredients.length > 0 ? (
                <ul className="divide-y divide-[#2a3737]/40">

                  {ingredients.map((ingredient, index) => (
                    <li
                      key={`${ingredient}-${index}`}
                      className="flex items-baseline gap-2 py-3"
                    >

                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D8E9AC]" />

                      <span className="font-sans text-sm font-medium text-[#D7E5E5]">
                        {ingredient}
                      </span>

                    </li>
                  ))}

                </ul>
              ) : (
                <p className="py-3 text-sm text-[#C6C8B9]">
                  {labels.noIngredients}
                </p>
              )}

            </div>

          </section>

          {/* ALLERGENI */}

          <section className="px-5 py-3">

            <div className="rounded-2xl border border-[#2a3737]/60 bg-[#152222] p-5 shadow-sm">

              <div className="mb-2 flex items-center justify-between gap-3 border-b border-[#2a3737]/60 pb-3.5">

                <h3 className="font-display text-lg font-medium tracking-tight text-white">
                  {labels.allergens}
                </h3>

                <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-[#C6C8B9]">
                  {labels.regulation}
                </span>

              </div>

              <p className="mb-2 font-sans text-xs leading-relaxed text-[#909285]">
                {labels.allergensNote}
              </p>

              {allergens.length > 0 ? (
                <ul className="divide-y divide-[#2a3737]/40">

                  {allergens.map((allergen) => (
                    <li
                      key={allergen}
                      className="flex items-baseline gap-2 py-3"
                    >

                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D8E9AC]" />

                      <span className="font-sans text-sm font-medium text-[#D7E5E5]">
                        {allergenLabels[allergen as AllergenId]?.[lang] ?? allergen}
                      </span>

                    </li>
                  ))}

                </ul>
              ) : (
                <p className="py-3 text-sm text-[#C6C8B9]">
                  {labels.noAllergens}
                </p>
              )}

            </div>

          </section>

          {/* VINO CONSIGLIATO */}

          {wineName && (
            <section className="px-5 py-3">

              <div className="rounded-2xl border border-[#2a3737]/60 bg-[#152222] p-5 shadow-sm">

                <div className="mb-3.5 flex items-center gap-2 border-b border-[#2a3737]/60 pb-3.5">

                  <Wine className="h-5 w-5 text-[#D8E9AC]" />

                  <h3 className="font-display text-lg font-medium tracking-tight text-white">
                    {labels.cellar}
                  </h3>

                </div>

                <div className="rounded-xl border border-[#2a3737]/40 bg-[#111e1e] p-4">

                  <p className="font-sans text-[10px] font-semibold uppercase tracking-widest text-[#D8E9AC]">
                    {labels.recommendedWine}
                  </p>

                  <h4 className="mt-1 font-display text-base font-semibold text-white">
                    {wineName}
                  </h4>

                  {wineNote && (
                    <p className="mt-3 font-sans text-sm leading-relaxed text-[#C6C8B9]">
                      {wineNote}
                    </p>
                  )}

                </div>

              </div>

            </section>
          )}

          {/* FIRMA */}

          <footer className="flex flex-col items-center justify-center gap-1 px-5 pb-5 pt-6 text-center">

            <span className="font-sans text-[10px] font-medium uppercase tracking-[0.25em] text-[#909285]">
              L'HORLOGE
            </span>

          </footer>

        </div>
      </main>
    </div>
  );
}
