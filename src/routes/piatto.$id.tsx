
import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Leaf,
  Sprout,
  WheatOff,
  Quote,
  Utensils,
  Wine,
  Box,
  X,
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
import { supabase } from "@/integrations/supabase/client";

const ModelViewer = "model-viewer" as any;

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

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerReady, setViewerReady] = useState(false);
  const [viewerLoadError, setViewerLoadError] = useState(false);

  const row = data.find((r) => r.id === id);

  const model3dEnabled = Boolean(
    row?.model_3d_enabled && row?.model_3d_glb,
  );

  const model3dUrl = row?.model_3d_glb
    ? supabase.storage
        .from("dish-models")
        .getPublicUrl(row.model_3d_glb).data.publicUrl
    : "";

  useEffect(() => {
    if (!viewerOpen) return;

    if (customElements.get("model-viewer")) {
      setViewerReady(true);
      return;
    }

    const existingScript = document.getElementById(
      "google-model-viewer-script",
    ) as HTMLScriptElement | null;

    const script = existingScript ?? document.createElement("script");

    const handleLoad = () => setViewerReady(true);
    const handleError = () => setViewerLoadError(true);

    script.addEventListener("load", handleLoad);
    script.addEventListener("error", handleError);

    if (!existingScript) {
      script.id = "google-model-viewer-script";
      script.type = "module";
      script.src =
        "https://cdn.jsdelivr.net/npm/@google/model-viewer@4.1.0/dist/model-viewer.min.js";

      document.head.appendChild(script);
    }

    return () => {
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
    };
  }, [viewerOpen]);

  useEffect(() => {
    if (!viewerOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setViewerOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [viewerOpen]);

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
    allergens:
      lang === "it"
        ? "Allergeni & Intolleranze"
        : "Allergens & Intolerances",
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

            {model3dEnabled && (
              <button
                type="button"
                onClick={() => {
                  setViewerLoadError(false);
                  setViewerReady(false);
                  setViewerOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#D8E9AC]/40 bg-[#D8E9AC] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#081616] shadow-sm transition hover:bg-[#e5f0c7]"
                aria-label={
                  lang === "it"
                    ? "Apri il modello 3D e la realtà aumentata"
                    : "Open 3D model and augmented reality"
                }
              >
                <Box className="h-3.5 w-3.5" />
                {lang === "it"
                  ? "3D / AR · Guarda il piatto"
                  : "3D / AR · View dish"}
              </button>
            )}
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

      {/* VISUALIZZATORE 3D / REALTÀ AUMENTATA */}

      {viewerOpen && model3dEnabled && model3dUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6"
          role="presentation"
          onClick={() => setViewerOpen(false)}
        >
          <section
            className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#D8E9AC]/20 bg-[#081616] shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label={
              lang === "it"
                ? "Visualizzatore 3D del piatto"
                : "Dish 3D viewer"
            }
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#2a3737]/70 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <Box className="h-5 w-5 shrink-0 text-[#D8E9AC]" />

                <div className="min-w-0">
                  <h2 className="truncate font-display text-base font-semibold text-white">
                    {d.name[lang]}
                  </h2>

                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#D8E9AC]">
                    {lang === "it"
                      ? "Modello 3D interattivo"
                      : "Interactive 3D model"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewerOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#D7E5E5] transition hover:bg-[#20302F] hover:text-white"
                aria-label={lang === "it" ? "Chiudi" : "Close"}
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="relative flex min-h-[320px] flex-1 items-center justify-center bg-[#101d1d]">
              {viewerLoadError ? (
                <p className="px-6 text-center text-sm text-[#D7E5E5]">
                  {lang === "it"
                    ? "Non è stato possibile caricare il visualizzatore 3D. Controlla la connessione e riprova."
                    : "The 3D viewer could not be loaded. Check your connection and try again."}
                </p>
              ) : (
                <>
                  {!viewerReady && (
                    <p className="absolute z-10 rounded-full bg-[#081616]/90 px-4 py-2 text-xs text-[#D7E5E5]">
                      {lang === "it"
                        ? "Preparazione del modello 3D…"
                        : "Preparing 3D model…"}
                    </p>
                  )}

                  <ModelViewer
                    src={model3dUrl}
                    alt={
                      lang === "it"
                        ? `Modello 3D di ${d.name[lang]}`
                        : `3D model of ${d.name[lang]}`
                    }
                    poster={d.image || undefined}
                    ar
                    ar-modes="webxr scene-viewer quick-look"
                    ar-scale="auto"
                    camera-controls
                    touch-action="pan-y"
                    auto-rotate
                    shadow-intensity="1"
                    exposure="1"
                    style={{
                      width: "100%",
                      height: "min(68vh, 620px)",
                      minHeight: "320px",
                      backgroundColor: "#101d1d",
                    }}
                  >
                    <button
                      slot="ar-button"
                      type="button"
                      className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-[#D8E9AC] px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#081616] shadow-lg"
                    >
                      {lang === "it"
                        ? "Visualizza nel tuo spazio · AR"
                        : "View in your space · AR"}
                    </button>
                  </ModelViewer>
                </>
              )}
            </div>

            <p className="shrink-0 border-t border-[#2a3737]/70 px-4 py-3 text-center text-[10px] leading-relaxed text-[#9eaaa6]">
              {lang === "it"
                ? "Ruota il piatto trascinando, usa le dita per ingrandire. Su dispositivi compatibili puoi aprire la modalità realtà aumentata."
                : "Drag to rotate the dish and pinch to zoom. On compatible devices you can launch augmented reality."}
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
