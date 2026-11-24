
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  Timer,
  Wine,
  UtensilsCrossed,
  MapPin,
  Clock,
  ArrowRight,
  Leaf,
} from "lucide-react";
import {
  categories,
  dietLabels,
  dietUi,
  formatPrice,
  ui,
  type CategoryId,
  type DietId,
} from "@/lib/menu-data";
import {
  activeMenusQuery,
  dishesQuery,
  menuDishesQuery,
  rowToDish,
} from "@/lib/menu-api";
import {
  AllergenChips,
  ClockMark,
  DietBadges,
  dietIcons,
  SiteHeader,
  useLang,
} from "@/components/menu-ui";
import { cn } from "@/lib/utils";

const catIds = ["all", ...categories.map((c) => c.id)] as const;
type CatFilter = CategoryId | "all";

const heroImage =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBfkL-S0hxM3G8JRjI-pm-oTCpbG2KMbykumiItQo6Fwi2MAGNy9nhWJrVEG6Hs-DupL6VVEFq0s-7tk_JUedIXG9pRC4z4KIu8vISBXIdRDhlb0t7ySOEyRXfpSvH09oWiAZKuPlMbrjG4WY3nqhKn2zQhocSk4cM8o3rRy-7lHCvqywjUTBv-sZlbh1YCtteYVHkSrPdiove8XvdTbdgu8k19OYGUyr-nOcMd7J5c_nXViUcHDsPp";

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): { cat?: CatFilter } => {
    const c = s["cat"] as CatFilter;
    return catIds.includes(c) && c !== "all" ? { cat: c } : {};
  },
  head: () => ({
    meta: [
      { title: "L'Horloge Ristorante & Bistrot — Menu Digitale, Catania" },
      {
        name: "description",
        content:
          "Il menu digitale di L'Horloge a Catania: antipasti, primi, secondi, dolci e vini dell'Etna. Disponibile in italiano e inglese.",
      },
      { property: "og:title", content: "L'Horloge — Menu Digitale" },
      {
        property: "og:description",
        content: "Ogni piatto ha il suo tempo. Scopri la carta di L'Horloge, Catania.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: async ({ context }) => {
    const menus = await context.queryClient.ensureQueryData(activeMenusQuery);

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
  const { lang } = useLang();
  const { cat = "all" } = Route.useSearch();
  const navigate = useNavigate({ from: "/" });

  const { data: menus } = useSuspenseQuery(activeMenusQuery);
  const [selectedMenuId, setSelectedMenuId] = useState("");

  const selectedMenu =
    menus.find((menu) => menu.id === selectedMenuId) ?? menus[0];

  const menuDishesResult = useQuery({
    ...menuDishesQuery(selectedMenu?.id ?? ""),
    enabled: Boolean(selectedMenu),
  });

  const fallbackDishesResult = useQuery({
    ...dishesQuery,
    enabled: menus.length === 0,
  });

  const data = selectedMenu
    ? menuDishesResult.data ?? []
    : fallbackDishesResult.data ?? [];

  const [diets, setDiets] = useState<DietId[]>([]);

  const dishes = data
    .map(rowToDish)
    .filter((d) => diets.every((k) => d.diets.includes(k)));

  const toggleDiet = (k: DietId) => {
    setDiets((previous) =>
      previous.includes(k)
        ? previous.filter((item) => item !== k)
        : [...previous, k],
    );
  };

  const t = (k: keyof typeof ui) => ui[k][lang];
  const menuRef = useRef<HTMLDivElement>(null);

  const pickCat = (id: CatFilter) => {
    navigate({
      search: id === "all" ? {} : { cat: id },
      replace: true,
      resetScroll: false,
    });

    const element = menuRef.current;

    if (element && element.getBoundingClientRect().top < 140) {
      window.scrollTo({
        top: element.getBoundingClientRect().top + window.scrollY - 150,
        behavior: "smooth",
      });
    }
  };

  const signatures = dishes.filter((dish) => dish.signature);

  const visibleCats = categories.filter(
    (category) => cat === "all" || category.id === cat,
  );

  const visibleCount = dishes.filter((dish) =>
    visibleCats.some((category) => category.id === dish.category),
  ).length;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#081616] text-[#d7e5e5]">
      <div className="pointer-events-none fixed -top-48 left-1/2 z-0 h-[560px] w-[850px] -translate-x-1/2 rounded-full bg-[#d8e9ac]/[0.035] blur-[130px]" />

      <div className="relative z-10">
        <SiteHeader />

        <main>
          {/* HERO */}
          <section className="px-4 pb-8 pt-4 sm:px-6 md:px-8">
            <div className="relative flex min-h-[490px] w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-[#d8e9ac]/20 bg-[#111e1e] px-5 py-12 text-center shadow-2xl sm:min-h-[530px] sm:px-8 md:min-h-[570px]">
              <img
                src={heroImage}
                alt="L'Horloge Bistrot e Ristorante"
                className="absolute inset-0 h-full w-full object-cover object-center brightness-[0.85]"
                fetchPriority="high"
              />

              <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-[#081616]/95" />

              <div className="relative z-10 my-auto flex w-full max-w-2xl flex-col items-center rounded-2xl border border-white/10 bg-black/65 px-6 py-9 shadow-2xl backdrop-blur-md sm:px-10 sm:py-12">
                <span className="mb-5 text-[10px] font-semibold uppercase tracking-[0.35em] text-[#d8e9ac] sm:text-xs">
                  L'Horloge · Ristorante & Bistrot
                </span>

                <h1 className="font-display text-4xl font-semibold leading-[1.12] tracking-tight text-[#f5f5ed] sm:text-5xl md:text-6xl">
                  {t("heroA")}
                  <br />
                  <span className="font-normal italic text-[#d8e9ac]">
                    {t("heroB")}
                  </span>
                </h1>

                <div className="my-6 h-px w-16 bg-[#d8e9ac]/70" />

                <p className="max-w-lg text-sm font-normal leading-7 text-white/85 sm:text-base">
                  {t("heroSub")}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    document.getElementById("carta")?.scrollIntoView({
                      behavior: "smooth",
                    })
                  }
                  className="mt-8 inline-flex min-h-11 items-center gap-3 rounded-full bg-[#d8e9ac] px-6 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[#081616] shadow-[0_4px_20px_rgba(216,233,172,0.18)] transition-all hover:scale-[1.03] hover:shadow-[0_4px_24px_rgba(216,233,172,0.28)]"
                >
                  {lang === "it" ? "Scopri il menu" : "Explore the menu"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="pointer-events-none absolute bottom-5 left-0 right-0 z-10 flex justify-center">
                <span className="text-[9px] font-medium uppercase tracking-[0.3em] text-white/55">
                  {lang === "it" ? "La nostra cucina · Il nostro tempo" : "Our cuisine · Our time"}
                </span>
              </div>
            </div>
          </section>

          {/* PIATTI ICONICI */}
          {signatures.length > 0 && (
            <section className="py-8 sm:py-10">
              <div className="mb-6 flex items-end justify-between px-4 sm:px-6 md:px-8">
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#d8e9ac] sm:text-xs">
                    {lang === "it" ? "Selezione dello Chef" : "Chef's Selection"}
                  </p>
                  <h2 className="font-display text-2xl font-semibold text-[#f1f2e9] sm:text-3xl">
                    {t("iconic")}
                  </h2>
                  <p className="mt-2 max-w-md text-xs leading-relaxed text-[#c6c8b9]/75 sm:text-sm">
                    {t("iconicSub")}
                  </p>
                </div>

                <span className="hidden items-center gap-2 pb-1 text-[10px] uppercase tracking-widest text-[#c6c8b9]/65 sm:flex">
                  {lang === "it" ? "Scorri" : "Scroll"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>

              <div className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:px-6 md:px-8">
                {signatures.map((dish) => (
                  <Link
                    key={dish.id}
                    to="/piatto/$id"
                    params={{ id: dish.id }}
                    className="group flex w-[265px] shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-[#45483d]/60 bg-[#152222] p-3 transition-all duration-300 hover:-translate-y-1 hover:border-[#d8e9ac]/50 hover:bg-[#1b2928] sm:w-[290px]"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[#111e1e]">
                      {dish.image ? (
                        <img
                          src={dish.image}
                          alt={dish.name[lang]}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[#d8e9ac]/50">
                          <UtensilsCrossed className="h-9 w-9" />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />

                      <span className="absolute right-3 top-3 rounded-full border border-[#d8e9ac]/40 bg-[#081616]/85 px-3 py-1.5 text-xs font-semibold tabular-nums text-[#d8e9ac] backdrop-blur-md">
                        {formatPrice(dish.price, lang)}
                      </span>

                      <span className="absolute bottom-3 left-3 inline-flex max-w-[85%] items-center gap-1.5 rounded-full border border-white/10 bg-black/65 px-3 py-1.5 text-[10px] text-white/90 backdrop-blur-md">
                        <Timer className="h-3 w-3 shrink-0 text-[#d8e9ac]" />
                        <span className="truncate">
                          {dish.signature!.note[lang]}
                        </span>
                      </span>
                    </div>

                    <div className="px-1 pb-1 pt-4">
                      <h3 className="font-display text-lg font-semibold text-[#f1f2e9] transition-colors group-hover:text-[#d8e9ac]">
                        {dish.name[lang]}
                      </h3>

                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#c6c8b9]/75">
                        {dish.description[lang]}
                      </p>

                      <div className="mt-4 flex items-start gap-2 border-t border-white/[0.07] pt-3 text-[11px] leading-relaxed text-[#c6c8b9]/80">
                        <Wine className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#d8e9ac]" />
                        <span>{dish.signature!.pairing[lang]}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* CARTA COMPLETA */}
          <section
            id="carta"
            className="scroll-mt-24 px-4 pb-20 pt-12 sm:px-6 md:px-8"
          >
            <div className="mb-8 border-b border-[#45483d]/50 pb-5">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#d8e9ac] sm:text-xs">
                {lang === "it" ? "Menu stagionale" : "Seasonal Menu"}
              </p>

              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 className="font-display text-2xl font-semibold tracking-wide text-[#f1f2e9] sm:text-3xl">
                  {t("fullMenu")}
                </h2>

                <span className="text-[10px] uppercase tracking-[0.15em] text-[#c6c8b9]/55">
                  {lang === "it" ? "La carta completa" : "The complete menu"}
                </span>
              </div>
            </div>

            {/* SELEZIONE MENU */}
            {menus.length > 1 && (
              <div className="mb-8 rounded-xl border border-[#45483d]/50 bg-[#111e1e] p-4 sm:p-5">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#c6c8b9]/75">
                  {lang === "it" ? "Seleziona il menu" : "Choose a menu"}
                </p>

                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-label={lang === "it" ? "Seleziona menu" : "Select menu"}
                >
                  {menus.map((menu) => {
                    const isSelected = selectedMenu?.id === menu.id;
                    const menuName =
                      (lang === "it" ? menu.name_it : menu.name_en) ||
                      menu.name_it ||
                      menu.name_en;

                    return (
                      <button
                        key={menu.id}
                        type="button"
                        onClick={() => {
                          setSelectedMenuId(menu.id);
                          setDiets([]);
                          pickCat("all");
                        }}
                        aria-pressed={isSelected}
                        className={cn(
                          "min-h-10 rounded-full border px-5 py-2.5 text-xs font-semibold transition-all",
                          isSelected
                            ? "border-[#d8e9ac] bg-[#d8e9ac] text-[#081616] shadow-[0_0_16px_rgba(216,233,172,0.12)]"
                            : "border-[#45483d]/70 bg-[#111e1e] text-[#c6c8b9] hover:border-[#d8e9ac]/50 hover:text-[#d8e9ac]",
                        )}
                      >
                        {menuName}
                      </button>
                    );
                  })}
                </div>

                {selectedMenu && (
                  <p className="mt-3 text-xs leading-relaxed text-[#c6c8b9]/70">
                    {lang === "it"
                      ? selectedMenu.description_it
                      : selectedMenu.description_en}
                  </p>
                )}
              </div>
            )}

            {/* FILTRI CATEGORIA */}
            <nav
              className="no-scrollbar sticky top-20 z-30 -mx-4 mb-7 flex snap-x gap-2 overflow-x-auto border-b border-[#45483d]/40 bg-[#081616]/95 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 md:-mx-8 md:px-8"
              aria-label={lang === "it" ? "Categorie del menu" : "Menu categories"}
            >
              {[{ id: "all" as const, label: ui.all }, ...categories].map(
                (category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => pickCat(category.id)}
                    aria-pressed={cat === category.id}
                    className={cn(
                      "min-h-10 shrink-0 snap-start rounded-full border px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] transition-all sm:px-5",
                      cat === category.id
                        ? "border-[#d8e9ac] bg-[#d8e9ac] text-[#081616]"
                        : "border-[#45483d]/70 bg-[#111e1e] text-[#c6c8b9]/80 hover:border-[#d8e9ac]/50 hover:text-[#d8e9ac]",
                    )}
                  >
                    {category.label[lang]}
                  </button>
                ),
              )}
            </nav>

            {/* FILTRI ALIMENTARI */}
            <div
              className="mb-9 flex flex-wrap items-center gap-2"
              role="group"
              aria-label={dietUi.title[lang]}
            >
              {(Object.keys(dietLabels) as DietId[]).map((key) => {
                const Icon = dietIcons[key];
                const isActive = diets.includes(key);

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleDiet(key)}
                    aria-pressed={isActive}
                    className={cn(
                      "inline-flex min-h-9 items-center gap-2 rounded-full border px-3.5 py-2 text-[10px] font-medium transition-all",
                      isActive
                        ? "border-[#d8e9ac]/70 bg-[#d8e9ac]/10 text-[#d8e9ac]"
                        : "border-[#45483d]/60 bg-[#111e1e] text-[#c6c8b9]/75 hover:border-[#d8e9ac]/40 hover:text-[#d8e9ac]",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {dietLabels[key][lang]}
                  </button>
                );
              })}

              <span className="ml-auto self-center text-[10px] tabular-nums text-[#c6c8b9]/55">
                {dietUi.count[lang](visibleCount)}
              </span>
            </div>

            {/* ELENCO PIATTI */}
            {visibleCount === 0 && (
              <div className="rounded-xl border border-[#45483d]/40 bg-[#111e1e] px-5 py-12 text-center">
                <Leaf className="mx-auto mb-3 h-6 w-6 text-[#d8e9ac]/60" />
                <p className="text-sm text-[#c6c8b9]/75">
                  {dietUi.empty[lang]}
                </p>
              </div>
            )}

            <div ref={menuRef} className="scroll-mt-40 space-y-12">
              {visibleCats.map((category) => {
                const list = dishes.filter(
                  (dish) => dish.category === category.id,
                );

                if (!list.length) return null;

                return (
                  <section key={category.id}>
                    <div className="mb-5 flex items-center gap-4">
                      <h3 className="shrink-0 font-display text-xl font-medium italic text-[#f1f2e9] sm:text-2xl">
                        {category.label[lang]}
                      </h3>
                      <span className="h-px flex-1 bg-[#45483d]/50" />
                      <span className="text-[10px] tabular-nums text-[#c6c8b9]/50">
                        {list.length.toString().padStart(2, "0")}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      {list.map((dish) => (
                        <Link
                          key={dish.id}
                          to="/piatto/$id"
                          params={{ id: dish.id }}
                          className="group flex min-w-0 gap-4 overflow-hidden rounded-xl border border-[#45483d]/45 bg-[#111e1e] p-3.5 text-left transition-all duration-300 hover:border-[#d8e9ac]/45 hover:bg-[#152222] active:scale-[0.99] sm:gap-5 sm:p-4"
                        >
                          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-lg bg-[#081616] sm:h-32 sm:w-32">
                            {dish.image ? (
                              <img
                                src={dish.image}
                                alt={dish.name[lang]}
                                loading="lazy"
                                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[#d8e9ac]/45">
                                {category.id === "bevande" ? (
                                  <Wine className="h-8 w-8" />
                                ) : (
                                  <UtensilsCrossed className="h-8 w-8" />
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex min-w-0 flex-1 flex-col py-0.5">
                            <div className="flex items-start justify-between gap-3">
                              <h4 className="font-display text-base font-semibold leading-snug text-[#f1f2e9] transition-colors group-hover:text-[#d8e9ac] sm:text-lg">
                                {dish.name[lang]}
                              </h4>

                              <span className="shrink-0 pt-0.5 font-display text-base font-semibold tabular-nums text-[#d8e9ac] sm:text-lg">
                                {formatPrice(dish.price, lang)}
                              </span>
                            </div>

                            {dish.tag[lang] && (
                              <span className="mt-2 w-fit rounded-full border border-[#d8e9ac]/30 bg-[#d8e9ac]/[0.06] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#d8e9ac]">
                                {dish.tag[lang]}
                              </span>
                            )}

                            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#c6c8b9]/70">
                              {dish.description[lang]}
                            </p>

                            <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-3">
                              {dish.diets.length > 0 ? (
                                <DietBadges list={dish.diets} />
                              ) : (
                                <span />
                              )}

                              <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#d8e9ac]/75 transition-colors group-hover:text-[#d8e9ac]">
                                {lang === "it" ? "Dettagli" : "Details"}
                                <ArrowRight className="h-3 w-3" />
                              </span>
                            </div>

                            <div className="mt-2">
                              <AllergenChips list={dish.allergens} />
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </section>
        </main>

        {/* FOOTER */}
        <footer className="border-t border-[#45483d]/50 bg-[#041010]">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-9 px-6 py-12 sm:grid-cols-2 md:grid-cols-3 md:px-8">
            <div>
              <div className="mb-4">
                <ClockMark />
              </div>

              <h3 className="font-display text-xl font-semibold text-[#f1f2e9]">
                L'Horloge
              </h3>

              <p className="mt-3 max-w-xs text-xs leading-relaxed text-[#c6c8b9]/65">
                {t("footer")}
              </p>
            </div>

            <div className="space-y-3 text-xs text-[#c6c8b9]/75">
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d8e9ac]">
                {lang === "it" ? "Dove siamo" : "Find us"}
              </p>

              <p className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#d8e9ac]" />
                <span>{t("address")}</span>
              </p>
            </div>

            <div className="space-y-3 text-xs text-[#c6c8b9]/75">
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d8e9ac]">
                {lang === "it" ? "Orari" : "Opening hours"}
              </p>

              <p className="flex items-start gap-2.5">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#d8e9ac]" />
                <span>{t("hours")}</span>
              </p>
            </div>
          </div>

          <div className="border-t border-[#45483d]/35 px-6 py-5 text-center">
            <p className="text-[10px] text-[#c6c8b9]/40">
              © {new Date().getFullYear()} L'Horloge Ristorante.{" "}
              {lang === "it" ? "Tutti i diritti riservati." : "All rights reserved."}
            </p>

            <Link
              to="/admin"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#45483d]/60 bg-[#111e1e] px-4 py-2 text-[10px] font-medium uppercase tracking-wider text-[#c6c8b9]/60 transition-colors hover:border-[#d8e9ac]/50 hover:text-[#d8e9ac]"
            >
              {lang === "it" ? "Area riservata" : "Admin area"}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
