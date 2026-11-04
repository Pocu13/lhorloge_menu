import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Timer, Wine, UtensilsCrossed, MapPin, Clock } from "lucide-react";
import { categories, dietLabels, dietUi, formatPrice, ui, type CategoryId, type DietId } from "@/lib/menu-data";
import { dishesQuery, rowToDish } from "@/lib/menu-api";
import { AllergenChips, ClockMark, DietBadges, dietIcons, SiteHeader, useLang } from "@/components/menu-ui";
import { cn } from "@/lib/utils";

const catIds = ["all", ...categories.map((c) => c.id)] as const;
type CatFilter = CategoryId | "all";

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): { cat?: CatFilter } => {
    const c = s["cat"] as CatFilter;
    return catIds.includes(c) && c !== "all" ? { cat: c } : {};
  },
  head: () => ({
    meta: [
      { title: "L'Horloge Ristorante & Bistrot — Menu Digitale, Catania" },
      { name: "description", content: "Il menu digitale di L'Horloge a Catania: antipasti, primi, secondi, dolci e vini dell'Etna. Disponibile in italiano e inglese." },
      { property: "og:title", content: "L'Horloge — Menu Digitale" },
      { property: "og:description", content: "Ogni piatto ha il suo tempo. Scopri la carta di L'Horloge, Catania." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(dishesQuery),
  component: Index,
});

function Index() {
  const { lang } = useLang();
  const { cat = "all" } = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const { data } = useSuspenseQuery(dishesQuery);
  const [diets, setDiets] = useState<DietId[]>([]);
  const dishes = data.map(rowToDish).filter((d) => diets.every((k) => d.diets.includes(k)));
  const toggleDiet = (k: DietId) => setDiets((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  const t = (k: keyof typeof ui) => ui[k][lang];
  const menuRef = useRef<HTMLDivElement>(null);

  const pickCat = (id: CatFilter) => {
    navigate({ search: id === "all" ? {} : { cat: id }, replace: true, resetScroll: false });
    const el = menuRef.current;
    if (el && el.getBoundingClientRect().top < 140) {
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 150, behavior: "smooth" });
    }
  };

  const signatures = dishes.filter((d) => d.signature);
  const visibleCats = categories.filter((c) => cat === "all" || c.id === cat);
  const visibleCount = dishes.filter((d) => visibleCats.some((c) => c.id === d.category)).length;

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none fixed -top-40 left-1/2 h-[520px] w-[720px] -translate-x-1/2 ambient-glow" />
      <SiteHeader />

      <main>
        <section className="mx-auto max-w-6xl px-6 pb-12 pt-16 text-center">
          <h1 className="mx-auto max-w-4xl font-display text-4xl leading-[1.15] tracking-tight text-title sm:text-5xl md:text-6xl">
            {t("heroA")} <span className="font-light italic text-sage">{t("heroB")}</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm font-light leading-relaxed text-muted-foreground sm:text-base md:text-lg">{t("heroSub")}</p>
        </section>

        {signatures.length > 0 && (
          <section className="mx-auto max-w-6xl px-5 py-10 sm:px-6">
            <div className="mb-10 flex flex-col justify-between border-b border-border/40 pb-4 md:flex-row md:items-end">
              <h2 className="font-display text-2xl text-title md:text-3xl">{t("iconic")}</h2>
              <p className="mt-2 max-w-xs text-xs text-muted-foreground md:mt-0 md:text-right">{t("iconicSub")}</p>
            </div>
            <div className="grid grid-cols-1 gap-7 md:grid-cols-3">
              {signatures.map((d) => (
                <Link key={d.id} to="/piatto/$id" params={{ id: d.id }} className="group flex flex-col overflow-hidden rounded-lg border border-border/30 bg-card/80 transition-all duration-500 hover:border-sage/60 active:scale-[0.99]">
                  <div className="relative aspect-[4/3] overflow-hidden bg-surface-low">
                    {d.image && <img src={d.image} alt={d.name[lang]} loading="lazy" className="h-full w-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105 group-hover:opacity-100" />}
                    <div className="absolute inset-0 image-fade" />
                    <div className="absolute right-4 top-4 rounded-full border border-sage/40 bg-background/90 px-3 py-1 text-xs font-semibold tracking-wider text-sage backdrop-blur-md">{formatPrice(d.price, lang)}</div>
                    <div className="absolute bottom-3 left-4 flex items-center gap-1.5 rounded bg-surface-high/80 px-2.5 py-1 text-xs text-foreground backdrop-blur-sm">
                      <Timer className="h-3.5 w-3.5 text-sage" /> {d.signature!.note[lang]}
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="font-display text-lg text-title transition-colors group-hover:text-sage">{d.name[lang]}</h3>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{d.description[lang]}</p>
                    <div className="mt-5 flex items-center gap-2 border-t border-border/30 pt-4 text-xs text-muted-foreground">
                      <Wine className="h-3.5 w-3.5 text-sage" /> {d.signature!.pairing[lang]}
                    </div>
                    <div className="mt-3"><AllergenChips list={d.allergens} /></div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mx-auto max-w-6xl px-5 pb-20 pt-14 sm:px-6">
          <p className="mb-5 text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("fullMenu")}</p>
          <nav className="no-scrollbar sticky top-20 z-30 -mx-5 mb-8 flex snap-x gap-2 overflow-x-auto border-b border-border/30 bg-background/95 px-5 py-3 backdrop-blur-md sm:mx-0 sm:gap-3 sm:px-0">
            {[{ id: "all" as const, label: ui.all }, ...categories].map((c) => (
              <button
                key={c.id}
                onClick={() => pickCat(c.id)}
                aria-pressed={cat === c.id}
                className={cn(
                  "min-h-11 shrink-0 snap-start rounded-full border px-5 py-2.5 text-xs font-medium uppercase tracking-wider transition-colors",
                  cat === c.id ? "border-sage bg-sage text-sage-foreground" : "border-border/60 text-foreground hover:border-sage/60",
                )}
              >
                {c.label[lang]}
              </button>
            ))}
          </nav>

          <div className="-mt-4 mb-8 flex flex-wrap items-center gap-2" role="group" aria-label={dietUi.title[lang]}>
            {(Object.keys(dietLabels) as DietId[]).map((k) => {
              const Icon = dietIcons[k];
              const on = diets.includes(k);
              return (
                <button key={k} onClick={() => toggleDiet(k)} aria-pressed={on}
                  className={cn("flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-xs transition-colors", on ? "border-sage bg-sage/15 text-sage" : "border-border/60 text-muted-foreground hover:border-sage/60")}>
                  <Icon className="h-3.5 w-3.5" /> {dietLabels[k][lang]}
                </button>
              );
            })}
            <span className="ml-auto text-xs text-muted-foreground" aria-live="polite">{dietUi.count[lang](visibleCount)}</span>
          </div>
          {visibleCount === 0 && <p className="py-10 text-center text-sm text-muted-foreground">{dietUi.empty[lang]}</p>}

          <div ref={menuRef} className="scroll-mt-40 space-y-14">
            {visibleCats.map((c) => {
              const list = dishes.filter((d) => d.category === c.id);
              if (!list.length) return null;
              return (
                <div key={c.id}>
                  <h3 className="mb-6 flex items-center gap-4 font-display text-2xl italic text-title">
                    {c.label[lang]}
                    <span className="h-px flex-1 bg-border/40" />
                  </h3>
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    {list.map((d) => (
                      <Link key={d.id} to="/piatto/$id" params={{ id: d.id }} className="group flex gap-4 rounded-lg border border-border/30 bg-card/60 p-5 text-left transition-colors hover:border-sage/50 active:scale-[0.99] sm:gap-5">
                        <div className="h-24 w-24 shrink-0 overflow-hidden rounded bg-surface-low sm:h-28 sm:w-28">
                          {d.image ? (
                            <img src={d.image} alt={d.name[lang]} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sage/60">
                              {c.id === "bevande" ? <Wine className="h-7 w-7" /> : <UtensilsCrossed className="h-7 w-7" />}
                            </div>
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-start justify-between gap-3">
                            <h4 className="font-display text-lg leading-snug text-title transition-colors group-hover:text-sage">{d.name[lang]}</h4>
                            <span className="shrink-0 font-display text-lg text-sage">{formatPrice(d.price, lang)}</span>
                          </div>
                          {d.tag[lang] && <span className="mt-2 w-fit rounded border border-sage/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-sage">{d.tag[lang]}</span>}
                          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{d.description[lang]}</p>
                          {d.diets.length > 0 && <div className="mt-3"><DietBadges list={d.diets} /></div>}
                          <div className="mt-3"><AllergenChips list={d.allergens} /></div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/30">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 py-10 text-center text-xs text-muted-foreground">
          <ClockMark />
          <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-sage" /> {t("address")}</p>
          <p className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-sage" /> {t("hours")}</p>
          <p className="max-w-md opacity-80">{t("footer")}</p>
          <Link to="/admin" className="mt-2 opacity-50 hover:opacity-100">Admin</Link>
        </div>
      </footer>
    </div>
  );
}
