
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import {
  activeMenusQuery,
  dishesQuery,
  menuDishesQuery,
  rowToDish,
} from "@/lib/menu-api";
import {
  categories,
  formatPrice,
  ui,
  type CategoryId,
  type Lang,
} from "@/lib/menu-data";
import { useLang } from "@/components/menu-ui";
import { cn } from "@/lib/utils";

const categoryFilters: {
  id: CategoryId | "all";
  label: { it: string; en: string };
}[] = [
  { id: "all", label: { it: "Tutti i Piatti", en: "All Dishes" } },
  { id: "antipasti", label: { it: "Antipasti & Tapas", en: "Starters & Tapas" } },
  { id: "primi", label: { it: "Primi Piatti", en: "First Courses" } },
  { id: "secondi", label: { it: "Secondi", en: "Main Courses" } },
  { id: "dolci", label: { it: "Dolci", en: "Desserts" } },
  { id: "bevande", label: { it: "Vini dell'Etna", en: "Etna Wines" } },
];

const logoImage =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDTXTdASEuKSSQxx_8Ix-8KoImuIvSi0WJZoZM4tfY1Cz2PTCPkary1-F3wZfkzVzFSEgLhr6yshJUgR019aanE9GyXPyNuLBlvUtYuPqPPn01pUr39IdMp7CWYy8Gah-56UwhyAi2mH3UWnpiLhYcRoU4pQLXOa258VRYruKSxDgx1ny77V7xR_ld86PrB2f8vQRRXGmfhFDeEgLD0sNON0_mhcxeOUjR21u7mwoVGbdYOVJt1XM3_";

const heroImage =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBfkL-S0hxM3G8JRjI-pm-oTCpbG2KMbykumiItQo6Fwi2MAGNy9nhWJrVEG6Hs-DupL6VVEFq0s-7tk_JUedIXG9pRC4z4KIu8vISBXIdRDhlb0t7ySOEyRXfpSvH09oWiAZKuPlMbrjG4WY3nqhKn2zQhocSk4cM8o3rRy-7lHCvqywjUTBv-sZlbh1YCtteYVHkSrPdiove8XvdTbdgu8k19OYGUyr-nOcMd7J5c_nXViUcHDsPp";

export const Route = createFileRoute("/")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { cat?: CategoryId } => {
    const category = search.cat;

    if (
      typeof category === "string" &&
      categories.some((item) => item.id === category)
    ) {
      return { cat: category as CategoryId };
    }

    return {};
  },

  head: () => ({
    meta: [
      {
        title: "L'Horloge — Cucina Siciliana Contemporanea",
      },
      {
        name: "description",
        content:
          "Scopri il menu di L'Horloge: cucina siciliana contemporanea, ingredienti del territorio e piatti preparati con cura.",
      },
      {
        property: "og:title",
        content: "L'Horloge — Cucina Siciliana Contemporanea",
      },
      {
        property: "og:description",
        content: "Ogni piatto ha il suo tempo.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
    ],
  }),

  loader: async ({ context }) => {
    const menus = await context.queryClient.ensureQueryData(
      activeMenusQuery,
    );

    if (menus.length > 0) {
      await context.queryClient.ensureQueryData(
        menuDishesQuery(menus[0].id),
      );
    } else {
      await context.queryClient.ensureQueryData(dishesQuery);
    }
  },

  component: Index,
});

function Index() {
  const { lang, setLang } = useLang();
  const { cat } = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const menuRef = useRef<HTMLDivElement>(null);

  const { data: menus } = useSuspenseQuery(activeMenusQuery);
  const activeMenu = menus[0];

  const menuResult = useQuery({
    ...menuDishesQuery(activeMenu?.id ?? ""),
    enabled: Boolean(activeMenu),
  });

  const fallbackResult = useQuery({
    ...dishesQuery,
    enabled: !activeMenu,
  });

  const rows = activeMenu
    ? menuResult.data ?? []
    : fallbackResult.data ?? [];

  const dishes = rows.map(rowToDish);
  const filteredDishes = cat
    ? dishes.filter((dish) => dish.category === cat)
    : dishes;

  const signatureDishes = dishes.filter((dish) => dish.signature);

  const selectCategory = (category: CategoryId | "all") => {
    navigate({
      search: category === "all" ? {} : { cat: category },
      replace: true,
      resetScroll: false,
    });

    menuRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const translated = (value: { it: string; en: string }) => value[lang];

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#081616] font-body text-[#d7e5e5] antialiased">

      {/* HEADER */}
      <header className="sticky top-0 z-40 flex h-[72px] items-center justify-between border-b border-[#45483d]/40 bg-[#081616]/95 px-5 backdrop-blur-md md:px-8">
        <Link to="/" aria-label="L'Horloge">
          <img
            src={logoImage}
            alt="L'Horloge"
            className="h-11 w-auto object-contain"
          />
        </Link>

        {/* LANGUAGE SELECTOR */}
        <div
          role="group"
          aria-label={lang === "it" ? "Seleziona lingua" : "Select language"}
          className="flex items-center gap-1 rounded-full border border-[#45483d] bg-[#111e1e] p-1"
        >
          {(["it", "en"] as Lang[]).map((language) => (
            <button
              key={language}
              type="button"
              onClick={() => setLang(language)}
              aria-pressed={lang === language}
              className={cn(
                "min-w-10 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors",
                lang === language
                  ? "bg-[#d8e9ac] text-[#081616]"
                  : "text-[#c6c8b9] hover:text-white",
              )}
            >
              {language}
            </button>
          ))}
        </div>
      </header>

      <main>

        {/* HERO */}
        <section className="px-4 pb-6 pt-4 md:px-8">
          <div className="relative flex min-h-[480px] w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-[#d8e9ac]/30 bg-[#111e1e] p-6 text-center md:min-h-[540px] md:p-10">
            <div className="absolute inset-0">
              <img
                src={heroImage}
                alt="L'Horloge Bistrot e Ristorante"
                className="h-full w-full object-cover object-center"
                fetchPriority="high"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/25 to-[#081616]/90" />
            </div>

            <div className="relative z-10 flex max-w-2xl flex-col items-center gap-5 rounded-xl border border-white/10 bg-black/75 px-6 py-9 shadow-2xl backdrop-blur-sm sm:px-10 sm:py-12">
              <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
                {ui.heroA[lang]}
                <br />
                <span className="font-normal italic text-[#d8e9ac]">
                  {ui.heroB[lang]}
                </span>
              </h1>

              <p className="max-w-lg text-sm leading-relaxed text-white/90 sm:text-base">
                {lang === "it"
                  ? "Tra pietre vulcaniche e tempi pazienti di cottura e maturazione. Una ricerca gastronomica dove ogni secondo svela la materia pura."
                  : "Between volcanic stones and patient cooking and ageing times. A gastronomic journey where every second reveals the pure essence of ingredients."}
              </p>
            </div>
          </div>
        </section>

        {/* SIGNATURE DISHES */}
        {signatureDishes.length > 0 && (
          <section className="py-7">
            <div className="px-4 pb-5 md:px-8">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#d8e9ac]">
                {lang === "it" ? "Selezione dello Chef" : "Chef's Selection"}
              </p>

              <h2 className="font-display text-2xl font-bold text-white md:text-3xl">
                {ui.iconic[lang]}
              </h2>

              <p className="mt-2 max-w-xl text-xs leading-relaxed text-[#c6c8b9]/75">
                {ui.iconicSub[lang]}
              </p>
            </div>

            <div className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 md:px-8">
              {signatureDishes.map((dish) => (
                <Link
                  key={dish.id}
                  to="/piatto/$id"
                  params={{ id: dish.id }}
                  className="group flex w-[260px] shrink-0 snap-start flex-col gap-3 rounded-xl border border-[#45483d]/50 bg-[#152222] p-3 transition-colors hover:border-[#d8e9ac]/60 sm:w-[285px]"
                >
                  <div className="aspect-[4/3] overflow-hidden rounded-lg bg-[#111e1e]">
                    {dish.image && (
                      <img
                        src={dish.image}
                        alt={dish.name[lang]}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                  </div>

                  <div>
                    <h3 className="font-display text-lg font-semibold text-white">
                      {dish.name[lang]}
                    </h3>

                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#c6c8b9]/75">
                      {dish.description[lang]}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* COMPLETE MENU */}
        <section className="px-4 py-9 md:px-8" id="carta">
          <div className="mb-6">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#d8e9ac]">
              {lang === "it" ? "Menu Stagionale" : "Seasonal Menu"}
            </p>

            <h2 className="font-display text-2xl font-bold uppercase text-white md:text-3xl">
              {ui.fullMenu[lang]}
            </h2>
          </div>

          {/* CATEGORY FILTERS */}
          <div className="no-scrollbar mb-8 flex gap-2.5 overflow-x-auto py-1">
            {categoryFilters.map((category) => {
              const selected = (cat ?? "all") === category.id;

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => selectCategory(category.id)}
                  aria-pressed={selected}
                  className={cn(
                    "shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors",
                    selected
                      ? "bg-[#d8e9ac] text-[#081616]"
                      : "border border-[#45483d] bg-[#111e1e] text-[#c6c8b9] hover:border-[#d8e9ac]/60 hover:text-white",
                  )}
                >
                  {translated(category.label)}
                </button>
              );
            })}
          </div>

          {/* DISHES */}
          <div
            ref={menuRef}
            className="grid scroll-mt-24 grid-cols-1 gap-4 md:grid-cols-2"
          >
            {filteredDishes.map((dish) => (
              <Link
                key={dish.id}
                to="/piatto/$id"
                params={{ id: dish.id }}
                className="group flex min-w-0 gap-4 rounded-xl border border-[#45483d]/50 bg-[#152222] p-3.5 transition-colors hover:border-[#d8e9ac]/60 sm:gap-5 sm:p-4"
              >
                <div className="h-28 w-28 shrink-0 overflow-hidden rounded-lg bg-[#111e1e] sm:h-32 sm:w-32">
                  {dish.image && (
                    <img
                      src={dish.image}
                      alt={dish.name[lang]}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {dish.tag[lang] && (
                        <span className="mb-2 inline-block rounded border border-[#d8e9ac]/30 bg-[#d8e9ac]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#d8e9ac]">
                          {dish.tag[lang]}
                        </span>
                      )}

                      <h3 className="font-display text-base font-semibold leading-snug text-white sm:text-lg">
                        {dish.name[lang]}
                      </h3>
                    </div>

                    <span className="shrink-0 font-display text-sm font-semibold text-[#d8e9ac] sm:text-base">
                      {formatPrice(dish.price, lang)}
                    </span>
                  </div>

                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[#c6c8b9]/75">
                    {dish.description[lang]}
                  </p>

                  <span className="mt-auto flex items-center gap-1 pt-3 text-[9px] font-semibold uppercase tracking-wider text-[#d8e9ac]">
                    {lang === "it" ? "Scopri" : "Discover"}
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {filteredDishes.length === 0 && (
            <p className="py-12 text-center text-sm text-[#c6c8b9]">
              {lang === "it"
                ? "Nessun piatto disponibile in questa categoria."
                : "No dishes available in this category."}
            </p>
          )}
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#45483d]/40 bg-[#041010] px-4 py-10 md:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <h3 className="font-display text-xl font-bold text-white">
              L'Horloge
            </h3>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-[#c6c8b9]/75">
              {ui.footer[lang]}
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-white">
              {lang === "it" ? "Contatti" : "Contact"}
            </h4>
            <p className="text-xs leading-relaxed text-[#c6c8b9]">
              {ui.address[lang]}
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-white">
              {lang === "it" ? "Orari" : "Opening Hours"}
            </h4>
            <p className="text-xs leading-relaxed text-[#c6c8b9]">
              {ui.hours[lang]}
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <Link
            to="/admin"
            className="rounded-full border border-[#45483d]/60 bg-[#111e1e] px-4 py-2 text-xs text-[#c6c8b9] transition-colors hover:border-[#d8e9ac]/60 hover:text-white"
          >
            {lang === "it" ? "Area Riservata / Admin" : "Reserved Area / Admin"}
          </Link>
        </div>

        <p className="mt-8 border-t border-[#45483d]/30 pt-6 text-center text-[10px] text-[#909285]">
          © {new Date().getFullYear()} L'Horloge Ristorante.
          {" "}
          {lang === "it" ? "Tutti i diritti riservati." : "All rights reserved."}
        </p>
      </footer>
    </div>
  );
}
