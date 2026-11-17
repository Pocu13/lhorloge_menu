
import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Leaf,
  Sprout,
  WheatOff,
  Quote,
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
    <div className="flex min-h-screen items-center justify-center bg-[#081616] px-6 text-center">
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
    back: lang === "it" ? "Torna al menu" : "Back to menu",
    vr: "3D/VR",
    kitchenThought: lang === "it" ? "Pensiero di Cucina" : "Kitchen Notes",
    ingredients: lang === "it" ? "Ingredienti" : "Ingredients",
    allergens: lang === "it" ? "Allergeni" : "Allergens",
    regulation: "REG. UE 1169/11",
    cellar: lang === "it" ? "Dalla Cantina de L'Horloge" : "From L'Horloge Cellar",
    recommendedWine: lang === "it" ? "Vino Consigliato" : "Recommended Wine",
    noIngredients: lang === "it" ? "Ingredienti non disponibili." : "Ingredients not available.",
    noAllergens: allergenUi.none[lang],
  };

  const wineName = d.sommelier?.wine[lang] || d.signature?.pairing[lang] || "";
  const wineNote = d.sommelier?.note[lang] || "";

  return (
    <div className="min-h-screen bg-[#081616] font-sans text-[#D7E5E5] antialiased">

      <main className="relative flex min-h-screen w-full flex-col bg-[#081616] pb-10">

        {/* FOTO A TUTTO SCHERMO CON PULSANTE INDIETRO */}

        <section className="relative h-[75svh] min-h-[520px] max-h-[850px] w-full overflow-hidden bg-[#041010]">

          {d.image && (
            <img
              src={d.image}
              alt={d.name[lang]}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-[#081616] via-[#081616]/20 to-transparent" />

          <button
            type="button"
            onClick={back}
            aria-label={labels.back}
            className="absolute left-4 top-[calc(env(safe-area-inset-top)+16px)] z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-[#152222]/70 text-white shadow-lg backdrop-blur-md transition-colors hover:text-[#D8E9AC]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="absolute bottom-4 right-4 z-10 rounded-full border border-[#45483d] bg-[#152222]/80 px-3 py-1.5 text-xs font-medium tracking-wide text-[#D8E9AC] shadow-lg backdrop-blur-md">
            {labels.vr}
          </div>

        </section>

        {/* TITOLO E PREZZO */}

        <section className="flex flex-col gap-3 px-4 pb-6 pt-4">

          <div className="flex flex-col gap-1.5">

            <span className="font-sans text-[11px] font-semibold uppercase tracking-widest text-[#D8E9AC]">
              {category?.label[lang]}
              {d.tag[lang] ? ` • ${d.tag[lang]}` : ""}
            </span>

            <h1 className="whitespace-normal font-display text-xl font-semibold leading-tight tracking-tight text-white sm:text-2xl">
              {d.name[lang]}
            </h1>

            <div className="flex items-baseline gap-2 pt-0.5">
              <span className="font-display text-2xl font-bold tracking-tight text-[#D8E9AC]">
                {formatPrice(d.price, lang)}
              </span>
            </div>

          </div>

        </section>

        {/* CONTENUTO DEL PIATTO */}

        <div className="flex flex-col gap-6 px-4 pb-6">

          {/* RACCONTO DEL PIATTO */}

          <section className="flex flex-col gap-4 rounded-xl bg-[#111e1e] p-5 shadow-sm">

            <p className="font-sans text-sm leading-relaxed text-[#C6C8B9]">
              {d.description[lang]}
            </p>

            {d.signature?.note[lang] && (
              <div className="flex flex-col gap-2 rounded-lg bg-[#152222] p-4 shadow-inner">

                <div className="flex items-center gap-2">
                  <Quote className="h-5 w-5 text-[#D8E9AC]" />
                  <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-[#D8E9AC]">
                    {labels.kitchenThought}
                  </span>
                </div>

                <blockquote className="font-display text-sm italic leading-relaxed text-[#D7E5E5]">
                  {d.signature.note[lang]}
                </blockquote>

              </div>
            )}

          </section>

          {/* INGREDIENTI */}

          <section className="flex flex-col gap-3 rounded-xl bg-[#111e1e] p-5 shadow-sm">

            <h2 className="font-display text-lg font-medium text-white">
              {labels.ingredients}
            </h2>

            {ingredients.length > 0 ? (
              <ul className="flex flex-col gap-2 pt-1 font-sans text-xs text-[#C6C8B9]">
                {ingredients.map((ingredient, index) => (
                  <li
                    key={`${ingredient}-${index}`}
                    className="flex items-center gap-2 rounded-lg bg-[#152222] p-2.5 text-[#D7E5E5]"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D8E9AC]" />
                    <span>{ingredient}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[#C6C8B9]">{labels.noIngredients}</p>
            )}

          </section>

          {/* ALLERGENI */}

          <section className="flex flex-col gap-3 rounded-xl bg-[#111e1e] p-5 shadow-sm">

            <div className="flex items-center justify-between gap-2">

              <h2 className="font-display text-lg font-medium text-white">
                {labels.allergens}
              </h2>

              <span className="whitespace-nowrap rounded-full bg-[#1f2c2c] px-2 py-0.5 font-sans text-[10px] font-semibold tracking-[0.08em] text-[#C6C8B9]">
                {labels.regulation}
              </span>

            </div>

            <p className="font-sans text-xs leading-tight text-[#909285]">
              {allergenUi.note[lang]}
            </p>

            {allergens.length > 0 ? (
              <div className="flex flex-col gap-2 pt-1">

                {allergens.map((allergen) => (
                  <div
                    key={allergen}
                    className="flex items-start gap-3 rounded-lg bg-[#152222] p-3"
                  >
                    <div className="flex-1">
                      <span className="font-sans text-xs font-semibold text-[#D7E5E5]">
                        {allergenLabels[allergen as AllergenId]?.[lang] ?? allergen}
                      </span>
                    </div>
                  </div>
                ))}

              </div>
            ) : (
              <p className="py-2 text-xs text-[#C6C8B9]">
                {labels.noAllergens}
              </p>
            )}

            {/* CARATTERISTICHE ALIMENTARI */}

            {diets.length > 0 && (
              <div className="flex flex-wrap items-center justify-around gap-3 pt-1 text-center">

                {diets.map((diet) => {
                  const Icon = dietIcons[diet];

                  return (
                    <div
                      key={diet}
                      className="flex items-center gap-1.5 font-sans text-xs text-[#D8E9AC]"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{dietLabels[diet][lang]}</span>
                    </div>
                  );
                })}

              </div>
            )}

          </section>

          {/* CANTINA */}

          {wineName && (
            <section className="flex flex-col gap-3 rounded-xl bg-[#111e1e] p-5 shadow-sm">

              <h2 className="font-display text-lg font-medium text-white">
                {labels.cellar}
              </h2>

              <div className="flex flex-col gap-3 rounded-lg bg-[#152222] p-3.5">

                <div className="flex flex-col">
                  <span className="font-sans text-xs uppercase tracking-wider text-[#C6C8B9]">
                    {labels.recommendedWine}
                  </span>

                  <h3 className="mt-1 font-display text-base font-semibold text-[#D7E5E5]">
                    {wineName}
                  </h3>
                </div>

                {wineNote && (
                  <p className="font-sans text-xs leading-relaxed text-[#C6C8B9]">
                    {wineNote}
                  </p>
                )}

              </div>

            </section>
          )}

          <div className="flex flex-col items-center justify-center gap-1 py-2 text-center">
            <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-[#909285]">
              L'HORLOGE
            </span>
          </div>

        </div>
      </main>
    </div>
  );
}
