import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ImportedDish = {
  category: string;
  name_it: string; name_en: string;
  description_it: string; description_en: string;
  ingredients_it: string[]; ingredients_en: string[];
  price: number;
  allergens: string[];
  is_vegetarian: boolean; is_vegan: boolean; is_gluten_free: boolean;
};

const ALLERGENS = ["glutine", "latte", "uova", "fruttaGuscio", "pesce", "crostacei", "sedano", "solfiti", "soia", "senape", "arachidi", "sesamo", "lupini", "molluschi"];
const CATEGORIES = ["antipasti", "primi", "secondi", "dessert", "bevande"];

const schema = {
  type: "OBJECT",
  properties: {
    dishes: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          category: { type: "STRING", enum: CATEGORIES },
          name_it: { type: "STRING" }, name_en: { type: "STRING" },
          description_it: { type: "STRING" }, description_en: { type: "STRING" },
          ingredients_it: { type: "ARRAY", items: { type: "STRING" } },
          ingredients_en: { type: "ARRAY", items: { type: "STRING" } },
          price: { type: "NUMBER" },
          allergens: { type: "ARRAY", items: { type: "STRING", enum: ALLERGENS } },
          is_vegetarian: { type: "BOOLEAN" }, is_vegan: { type: "BOOLEAN" }, is_gluten_free: { type: "BOOLEAN" },
        },
        required: ["category", "name_it", "name_en", "description_it", "description_en", "ingredients_it", "ingredients_en", "price", "allergens", "is_vegetarian", "is_vegan", "is_gluten_free"],
      },
    },
  },
  required: ["dishes"],
};

const PROMPT = `Sei un assistente che legge menu di ristoranti italiani. Estrai TUTTI i piatti e le bevande dal documento allegato.
Per ogni voce: categoria (antipasti, primi, secondi, dessert, bevande), nome e descrizione in italiano e inglese (traduci se manca una lingua; descrizione vuota se assente), ingredienti come lista breve in IT ed EN, prezzo in euro come numero (0 se assente).
Allergeni (Reg. UE 1169/2011) usando solo questi codici: ${ALLERGENS.join(", ")}.
is_vegetarian/is_vegan/is_gluten_free: true solo se chiaramente compatibile.`;

export const extractMenu = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { fileName: string; mimeType: string; base64: string }) => {
    if (!d?.base64 || d.base64.length > 20_000_000) throw new Error("File mancante o troppo grande (max ~15MB)");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Non autorizzato");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Chiave API GEMINI_API_KEY non configurata sul server.");
    }

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: PROMPT },
                {
                  inline_data: {
                    mime_type: data.mimeType || "application/pdf",
                    data: data.base64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            response_mime_type: "application/json",
            response_schema: schema,
          },
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Errore API Gemini (${response.status}): ${errBody}`);
      }

      const json = await response.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const parsed = JSON.parse(text) as { dishes: ImportedDish[] };

      return { dishes: parsed.dishes, error: null as string | null };
    } catch (e) {
      console.error("extractMenu failed", e);
      const msg = e instanceof Error ? e.message : "Impossibile leggere il menu.";
      return { dishes: [] as ImportedDish[], error: msg };
    }
  });
