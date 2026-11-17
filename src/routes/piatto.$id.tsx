
import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Check,
  Leaf,
  Sprout,
  WheatOff,
  Wine,
} from "lucide-react";
import { allergenUi, categories, dietLabels, formatPrice } from "@/lib/menu-data";
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
    <div className="flex min-h-screen items-center justify-center bg-[#0B1818] px-6 text-center">
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
  const { lang, setLang } = useLang();
  const router = useRouter();
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(dishesQuery);

  const row = data.find((r) => r.id === id);

  if (!row) return null;

  const d = rowToDish(row);
  const cat = categories.find((c) => c.id === d.category);

  const back = () => {
    if (window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: "/" });
    }
  };

  const labels = {
    back: lang === "it" ? "Torna al menu" : "Back to menu",
    category: lang === "it" ? "LA NOSTRA CUCINA" : "OUR KITCHEN",
    story: lang === "it" ? "LA FILOSOFIA DEL PIATTO" : "THE STORY BEHIND THE DISH",
    ingredients: lang === "it" ? "Ingredienti selezionati" : "Selected ingredients",
    ingredientsSub:
      lang === "it"
        ? "La qualità nasce dalla scelta delle materie prime."
        : "Quality begins with the choice of ingredients.",
    allergens: lang === "it" ? "Allergeni e intolleranze" : "Allergens & intolerances",
    allergensSub:
      lang === "it"
        ? "Consulta le informazioni sugli allergeni presenti nel piatto."
        : "Check the allergen information for this dish.",
    dietary: lang === "it" ? "Caratteristiche alimentari" : "Dietary information",
    signature: lang === "it" ? "LA FIRMA DELLO CHEF" : "THE CHEF'S SIGNATURE",
    wine: lang === "it" ? "L'ABBINAMENTO DEL SOMMELIER" : "THE SOMMELIER'S PAIRING",
    wineSub:
      lang === "it"
        ? "Un incontro pensato per esaltare ogni sfumatura del piatto."
        : "A pairing designed to enhance every nuance of the dish.",
    noIngredients:
      lang === "it"
        ? "Informazioni sugli ingredienti non disponibili."
        : "Ingredient information is not available.",
    noAllergens:
      lang === "it"
        ? "Nessun allergene segnalato."
        : "No allergens reported.",
    price: lang === "it" ? "PREZZO" : "PRICE",
    menu: lang === "it" ? "TORNA ALLA CARTA" : "BACK TO MENU",
  };

  const dietIcons = {
    is_vegetarian: Leaf,
    is_vegan: Sprout,
    is_gluten_free: WheatOff,
  };

  return (
    <div className="min-h-screen bg-[#0B1818] pb-28 text-[#E7EDE5]">

      {/* HERO FOTOGRAFICO */}

      <section className="relative isolate h-[54vh] min-h-[340px] max-h-[650px] w-full overflow-hidden bg-[#132726] sm:h-[62vh]">

        {d.image ? (
          <img
            src={d.image}
            alt={d.name[lang]}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#243B35] to-[#081616]" />
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-[#0B1818]" />

        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 pt-6 sm:px-10 sm:pt-8">

          <button
            onClick={back}
            aria-label={labels.back}
            className="flex h-12 items-center gap-2 rounded-full border border-white/25 bg-black/25 px-5 text-sm text-white backdrop-blur-md transition-colors hover:bg-black/50"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{labels.back}</span>
          </button>

          <div className="flex rounded-full border border-white/25 bg-black/25 p-1 text-xs font-semibold backdrop-blur-md">
            {(["it", "en"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
                className={`min-w-10 rounded-full px-3 py-2 uppercase transition-colors ${
                  lang === l
                    ? "bg-[#D8E9AC] text-[#14231D]"
                    : "text-white hover:bg-white/10"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-10 mx-auto max-w-6xl px-6 pb-8 sm:px-10 sm:pb-12">

          {d.tag[lang] && (
            <span className="inline-flex rounded-full border border-[#D8E9AC]/50 bg-[#0B1818]/50 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D8E9AC] backdrop-blur-sm">
              {d.tag[lang]}
            </span>
          )}

          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.35em] text-[#D8E9AC]">
            {cat?.label[lang] ?? labels.category}
          </p>

          <h1 className="mt-3 max-w-4xl font-display text-4xl leading-tight text-white sm:text-5xl md:text-6xl">
            {d.name[lang]}
          </h1>

          <p className="mt-3 font-display text-2xl text-[#D8E9AC]">
            {formatPrice(d.price, lang)}
          </p>
        </div>
      </section>

      {/* CONTENUTO */}

      <main className="mx-auto max-w-6xl px-5 sm:px-10">

        {/* INTRODUZIONE */}

        <section className="border-b border-white/10 py-10 sm:py-14">

          <div className="flex items-center gap-3">
            <span className="h-px w-9 bg-[#D8E9AC]" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#D8E9AC]">
              {labels.story}
            </p>
          </div>

          <p className="mt-6 max-w-3xl font-display text-xl leading-relaxed text-[#E7EDE5] sm:text-2xl sm:leading-relaxed">
            {d.description[lang]}
          </p>

          {d.signature?.note[lang] && (
            <div className="mt-8 border-l-2 border-[#D8E9AC] py-2 pl-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#D8E9AC]">
                {labels.signature}
              </p>
              <p className="mt-2 font-display text-lg italic leading-relaxed text-[#C7D0C2]">
                {d.signature.note[lang]}
              </p>
            </div>
          )}

          {d.diets.length > 0 && (
            <div className="mt-8">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#A7B7A8]">
                {labels.dietary}
              </p>

              <div className="flex flex-wrap gap-2">
                {d.diets.map((diet) => {
                  const Icon = dietIcons[diet];

                  return (
                    <span
                      key={diet}
                      className="inline-flex items-center gap-2 rounded-full border border-[#D8E9AC]/30 bg-[#132726] px-4 py-2 text-xs text-[#D8E9AC]"
                    >
                      <Icon className="h-4 w-4" />
                      {dietLabels[diet][lang]}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* INGREDIENTI */}

        <section className="border-b border-white/10 py-10 sm:py-14">

          <div className="flex items-center gap-3">
            <span className="h-px w-9 bg-[#D8E9AC]" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#D8E9AC]">
              {labels.ingredients}
            </p>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-[#91A49A]">
            {labels.ingredientsSub}
          </p>

          {d.ingredients[lang].length > 0 ? (
            <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {d.ingredients[lang].map((ingredient, index) => (
                <div
                  key={`${ingredient}-${index}`}
                  className="flex min-h-[68px] items-center gap-4 rounded-xl border border-white/10 bg-[#132726] px-5 py-4 transition-colors hover:border-[#D8E9AC]/30"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D8E9AC]/10 text-xs text-[#D8E9AC]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-sm leading-relaxed text-[#E7EDE5]">
                    {ingredient}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm text-[#91A49A]">
              {labels.noIngredients}
            </p>
          )}
        </section>

        {/* ALLERGENI */}

        <section className="border-b border-white/10 py-10 sm:py-14">

          <div className="flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-[#D8B58A]" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#D8B58A]">
              {labels.allergens}
            </p>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-[#91A49A]">
            {labels.allergensSub}
          </p>

          {d.allergens && d.allergens.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {d.allergens.map((allergen) => (
                <span
                  key={allergen}
                  className="rounded-full border border-[#D8B58A]/30 bg-[#D8B58A]/10 px-4 py-2 text-xs font-medium text-[#E5CBA9]"
                >
                  {allergen}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-6 flex items-center gap-2 text-sm text-[#D8E9AC]">
              <Check className="h-4 w-4" />
              {labels.noAllergens}
            </p>
          )}

          <p className="mt-5 max-w-2xl text-xs leading-relaxed text-[#91A49A]">
            {allergenUi.note[lang]}
          </p>
        </section>

        {/* SOMMELIER */}

        {d.sommelier && (
          <section className="py-10 sm:py-14">

            <div className="rounded-2xl border border-[#D8E9AC]/20 bg-gradient-to-br from-[#192F2B] to-[#10201F] p-6 sm:p-10">

              <div className="flex items-center gap-3">
                <Wine className="h-5 w-5 text-[#D8E9AC]" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#D8E9AC]">
                  {labels.wine}
                </p>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-[#91A49A]">
                {labels.wineSub}
              </p>

              <h2 className="mt-7 font-display text-2xl leading-snug text-white sm:text-3xl">
                {d.sommelier.wine[lang]}
              </h2>

              {d.sommelier.note[lang] && (
                <p className="mt-4 max-w-2xl text-sm italic leading-relaxed text-[#B8C5B9]">
                  {d.sommelier.note[lang]}
                </p>
              )}

              <div className="mt-7 flex items-center gap-2 text-xs uppercase tracking-widest text-[#D8E9AC]">
                {labels.wine}
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
          </section>
        )}

        {/* ABBINAMENTO PIATTO FIRMATO */}

        {!d.sommelier && d.signature?.pairing[lang] && (
          <section className="py-10 sm:py-14">
            <div className="rounded-2xl border border-[#D8E9AC]/20 bg-[#132726] p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <Wine className="h-5 w-5 text-[#D8E9AC]" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#D8E9AC]">
                  {labels.wine}
                </p>
              </div>

              <p className="mt-5 font-display text-xl text-white">
                {d.signature.pairing[lang]}
              </p>
            </div>
          </section>
        )}

        <div className="pb-10 pt-4 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#91A49A]">
            L'HORLOGE · CATANIA
          </p>
        </div>

      </main>

      {/* BARRA INFERIORE */}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0B1818]/95 px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-xl">

        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">

          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-[10px] uppercase tracking-[0.2em] text-[#91A49A]">
              {labels.price}
            </p>
            <p className="mt-1 font-display text-xl text-[#D8E9AC]">
              {formatPrice(d.price, lang)}
            </p>
          </div>

          <button
            onClick={back}
            className="flex min-h-12 w-full items-center justify-center gap-3 rounded-full bg-[#D8E9AC] px-6 text-xs font-bold uppercase tracking-[0.15em] text-[#14231D] transition-colors hover:bg-[#E7F2C8] sm:ml-auto sm:w-auto sm:min-w-[260px]"
          >
            <ArrowLeft className="h-4 w-4" />
            {labels.menu}
          </button>

        </div>
      </div>

    </div>
  );
}
