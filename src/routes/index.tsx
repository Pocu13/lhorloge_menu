
import { createContext, useContext, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Leaf, Sprout, WheatOff } from "lucide-react";
import {
  allergenLabels,
  allergenUi,
  dietLabels,
  ui,
  type AllergenId,
  type DietId,
  type Lang,
} from "@/lib/menu-data";
import { cn } from "@/lib/utils";

const LangCtx = createContext<{
  lang: Lang;
  setLang: (lang: Lang) => void;
}>({
  lang: "it",
  setLang: () => {},
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("it");

  return (
    <LangCtx.Provider value={{ lang, setLang }}>
      {children}
    </LangCtx.Provider>
  );
}

export const useLang = () => useContext(LangCtx);

export function ClockMark({
  size = "large",
}: {
  size?: "small" | "large";
}) {
  return (
    <img
      src="/logo.png"
      alt="L'Horloge"
      className={cn(
        "shrink-0 object-contain",
        size === "small" ? "h-12 w-12" : "h-24 w-24",
      )}
    />
  );
}

export function AllergenChips({
  list = [],
  size = "sm",
}: {
  list?: string[] | undefined;
  size?: "sm" | "md";
}) {
  const { lang } = useLang();

  if (!list.length) {
    return (
      <span className="text-[11px] text-[#c6c8b9]/55">
        {allergenUi.none[lang]}
      </span>
    );
  }

  return (
    <ul
      className="flex flex-wrap gap-1.5"
      aria-label={allergenUi.title[lang]}
    >
      {list.map((allergen) => (
        <li
          key={allergen}
          className={cn(
            "rounded-full border border-[#b98c76]/35 bg-[#b98c76]/[0.08] font-medium text-[#d6ad98]",
            size === "sm"
              ? "px-2 py-0.5 text-[10px]"
              : "px-3 py-1 text-xs",
          )}
        >
          {allergenLabels[allergen as AllergenId]?.[lang] ?? allergen}
        </li>
      ))}
    </ul>
  );
}

export function SiteHeader() {
  const { lang, setLang } = useLang();

  return (
    <header className="sticky top-0 z-40 border-b border-[#45483d]/50 bg-[#081616]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-4 sm:px-6 md:px-8">
        <Link
          to="/"
          className="flex min-w-0 items-center gap-2.5"
          aria-label="L'Horloge - Home"
        >
          <ClockMark size="small" />

          <span className="font-display text-xl font-semibold tracking-wide text-[#f1f2e9] sm:text-2xl">
            L'Horloge
          </span>
        </Link>

        <div className="flex items-center gap-4 sm:gap-6">
          <div className="hidden items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[#c6c8b9]/65 md:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[#d8e9ac]" />
            <span>{ui.address[lang]}</span>
          </div>

          <div
            role="group"
            aria-label={lang === "it" ? "Lingua" : "Language"}
            className="flex items-center rounded-full border border-[#45483d]/70 bg-[#111e1e] p-1"
          >
            {(["it", "en"] as Lang[]).map((language) => {
              const isActive = lang === language;

              return (
                <button
                  key={language}
                  type="button"
                  onClick={() => setLang(language)}
                  aria-pressed={isActive}
                  className={cn(
                    "min-h-8 min-w-10 rounded-full px-3 text-[10px] font-bold uppercase tracking-widest transition-all",
                    isActive
                      ? "bg-[#d8e9ac] text-[#081616]"
                      : "text-[#c6c8b9]/65 hover:text-[#d8e9ac]",
                  )}
                >
                  {language}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}

export const dietIcons: Record<DietId, typeof Leaf> = {
  is_vegetarian: Leaf,
  is_vegan: Sprout,
  is_gluten_free: WheatOff,
};

export function DietBadges({
  list,
  size = "sm",
}: {
  list: DietId[];
  size?: "sm" | "md";
}) {
  const { lang } = useLang();

  if (!list.length) return null;

  return (
    <ul className="flex flex-wrap gap-1.5">
      {list.map((diet) => {
        const Icon = dietIcons[diet];

        return (
          <li
            key={diet}
            title={dietLabels[diet][lang]}
            className={cn(
              "flex items-center gap-1 rounded-full border border-[#d8e9ac]/30 bg-[#d8e9ac]/[0.06] text-[#d8e9ac]",
              size === "sm"
                ? "px-2 py-0.5 text-[10px]"
                : "px-3 py-1 text-xs",
            )}
          >
            <Icon
              className={
                size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"
              }
            />
            {dietLabels[diet][lang]}
          </li>
        );
      })}
    </ul>
  );
}
