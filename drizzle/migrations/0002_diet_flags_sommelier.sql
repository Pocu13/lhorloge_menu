ALTER TABLE public.dishes
  ADD COLUMN is_vegetarian boolean NOT NULL DEFAULT false,
  ADD COLUMN is_vegan boolean NOT NULL DEFAULT false,
  ADD COLUMN is_gluten_free boolean NOT NULL DEFAULT false,
  ADD COLUMN sommelier_wine_it text,
  ADD COLUMN sommelier_wine_en text,
  ADD COLUMN sommelier_note_it text,
  ADD COLUMN sommelier_note_en text;
UPDATE public.dishes SET sommelier_wine_it = signature_pairing_it, sommelier_wine_en = signature_pairing_en WHERE signature_pairing_it IS NOT NULL AND signature_pairing_it <> '';