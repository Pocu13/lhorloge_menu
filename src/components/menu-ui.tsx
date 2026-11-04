import { createContext, useContext, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Leaf, Sprout, WheatOff } from "lucide-react";
import { allergenLabels, allergenUi, dietLabels, ui, type AllergenId, type DietId, type Lang } from "@/lib/menu-data";
import { cn } from "@/lib/utils";

const LangCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "it", setLang: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("it");
  return <LangCtx.Provider value={{ lang, setLang }}>{children}</LangCtx.Provider>;
}
export const useLang = () => useContext(LangCtx);

export function ClockMark() {
  return (
    <svg viewBox="0 0 40 40" className="h-10 w-10 text-title transition-transform duration-500 group-hover:rotate-45" fill="none" stroke="currentColor">
      <circle cx="20" cy="20" r="18.5" strokeWidth="1" />
      <circle cx="20" cy="20" r="15" strokeWidth="0.5" opacity="0.6" />
      {Array.from({ length: 12 }).map((_, i) => (
        <line key={i} x1="20" y1="6.5" x2="20" y2={i % 3 === 0 ? "9" : "7.8"} strokeWidth="0.8" transform={`rotate(${i * 30} 20 20)`} />
      ))}
      <line x1="20" y1="20" x2="20" y2="11" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="20" y1="20" x2="26" y2="23" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="20" cy="20" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function AllergenChips({ list = [], size = "sm" }: { list?: string[] | undefined; size?: "sm" | "md" }) {
  const { lang } = useLang();
  if (!list.length) return <span className="text-[11px] text-muted-foreground">{allergenUi.none[lang]}</span>;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label={allergenUi.title[lang]}>
      {list.map((a) => (
        <li key={a} className={cn("rounded-full bg-destructive/15 font-medium text-destructive ring-1 ring-destructive/40", size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs")}>
          {allergenLabels[a as AllergenId]?.[lang] ?? a}
        </li>
      ))}
    </ul>
  );
}

export function SiteHeader() {
  const { lang, setLang } = useLang();
  return (
    <header className="sticky top-0 z-40 border-b border-border/30 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5 sm:px-6">
        <Link to="/" className="group flex items-center gap-3">
          <ClockMark />
          <span className="font-display text-xl text-title sm:text-2xl">l'horloge</span>
        </Link>
        <div className="flex items-center gap-5">
          <div className="hidden items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground md:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sage" />
            {ui.address[lang]}
          </div>
          <div role="group" aria-label="Language" className="flex rounded-full border border-border/60 p-0.5 text-[11px] font-semibold tracking-widest">
            {(["it", "en"] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
                className={cn("min-h-9 rounded-full px-3 py-1.5 uppercase transition-colors", lang === l ? "bg-sage text-sage-foreground" : "text-muted-foreground hover:text-title")}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

export const dietIcons: Record<DietId, typeof Leaf> = { is_vegetarian: Leaf, is_vegan: Sprout, is_gluten_free: WheatOff };

export function DietBadges({ list, size = "sm" }: { list: DietId[]; size?: "sm" | "md" }) {
  const { lang } = useLang();
  if (!list.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {list.map((d) => {
        const Icon = dietIcons[d];
        return (
          <li key={d} title={dietLabels[d][lang]} className={cn("flex items-center gap-1 rounded-full border border-sage/40 text-sage", size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs")}>
            <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} /> {dietLabels[d][lang]}
          </li>
        );
      })}
    </ul>
  );
}
