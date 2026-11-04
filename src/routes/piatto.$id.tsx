import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Wine } from "lucide-react";
import { allergenUi, categories, dietUi, formatPrice, ui } from "@/lib/menu-data";
import { dishesQuery, rowToDish } from "@/lib/menu-api";
import { AllergenChips, DietBadges, SiteHeader, useLang } from "@/components/menu-ui";

export const Route = createFileRoute("/piatto/$id")({
  loader: async ({ context, params }) => {
    const rows = await context.queryClient.ensureQueryData(dishesQuery);
    const row = rows.find((r) => r.id === params.id);
    if (!row) throw notFound();
    return { name: row.name_it, description: row.description_it };
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
      : [{ title: "Piatto non disponibile — L'Horloge" }, { name: "robots", content: "noindex" }],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen"><SiteHeader />
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <p className="font-display text-2xl text-title">Piatto non trovato · Dish not found</p>
        <Link to="/" className="mt-6 inline-block text-sage underline">Menu</Link>
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
  const cat = categories.find((c) => c.id === d.category);
  const back = () => (window.history.length > 1 ? router.history.back() : router.navigate({ to: "/" }));

  return (
    <div className="min-h-screen pb-28">
      <SiteHeader />
      <main className="mx-auto max-w-3xl">
        <div className="px-5 pt-5 sm:px-6">
          <button onClick={back} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border/60 px-4 text-sm text-title hover:border-sage/60">
            <ArrowLeft className="h-4 w-4" /> {lang === "it" ? "Torna al menu" : "Back to menu"}
          </button>
        </div>
        {d.image && (
          <div className="relative mt-5 aspect-[4/3] w-full overflow-hidden sm:rounded-lg">
            <img src={d.image} alt={d.name[lang]} className="h-full w-full object-cover" />
            <div className="absolute inset-0 image-fade" />
          </div>
        )}
        <article className="px-5 py-8 sm:px-6">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{cat?.label[lang]}</p>
          {d.tag[lang] && <span className="mt-4 inline-block rounded border border-sage/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-sage">{d.tag[lang]}</span>}
          <h1 className="mt-4 font-display text-3xl leading-snug text-title sm:text-4xl">{d.name[lang]}</h1>
          <p className="mt-2 font-display text-2xl text-sage">{formatPrice(d.price, lang)}</p>
          {d.diets.length > 0 && <div className="mt-4"><DietBadges list={d.diets} size="md" /></div>}
          <p className="mt-5 leading-relaxed text-muted-foreground">{d.description[lang]}</p>

          <h2 className="mt-8 text-xs uppercase tracking-[0.25em] text-muted-foreground">{ui.ingredients[lang]}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {d.ingredients[lang].map((i) => <li key={i} className="rounded-full border border-border/60 px-3 py-1 text-xs text-foreground">{i}</li>)}
          </ul>

          <h2 className="mt-8 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" /> {allergenUi.title[lang]}
          </h2>
          <div className="mt-3"><AllergenChips list={d.allergens} size="md" /></div>
          <p className="mt-2 text-[11px] text-muted-foreground/80">{allergenUi.note[lang]}</p>

          {d.sommelier && (
            <section className="mt-10 rounded-lg border border-sage/30 bg-surface-low/60 p-6">
              <h2 className="flex items-center gap-2 font-display text-xl italic text-title"><Wine className="h-5 w-5 text-sage" /> {dietUi.sommelier[lang]}</h2>
              <p className="mt-4 font-display text-lg text-sage">{d.sommelier.wine[lang]}</p>
              {d.sommelier.note[lang] && <p className="mt-1 text-sm italic leading-relaxed text-muted-foreground">{d.sommelier.note[lang]}</p>}
            </section>
          )}
          {!d.sommelier && d.signature?.pairing[lang] && (
            <div className="mt-8 flex items-center gap-2 border-t border-border/30 pt-5 text-sm text-muted-foreground">
              <Wine className="h-4 w-4 text-sage" /> {ui.pairing[lang]}: <span className="text-foreground">{d.signature.pairing[lang]}</span>
            </div>
          )}
        </article>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/40 bg-background/95 p-4 backdrop-blur-md sm:hidden">
        <button onClick={back} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-sage text-sm font-semibold text-sage-foreground">
          <ArrowLeft className="h-4 w-4" /> {lang === "it" ? "Torna al menu" : "Back to menu"}
        </button>
      </div>
    </div>
  );
}
