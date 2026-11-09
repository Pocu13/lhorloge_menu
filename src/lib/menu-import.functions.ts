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

const str = { type: "string" } as const;
const strArr = { type: "array", items: str } as const;
const schema = {
  type: "object",
  additionalProperties: false,
  required: ["dishes"],
  properties: {
    dishes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category", "name_it", "name_en", "description_it", "description_en", "ingredients_it", "ingredients_en", "price", "allergens", "is_vegetarian", "is_vegan", "is_gluten_free"],
        properties: {
          category: { type: "string", enum: CATEGORIES },
          name_it: str, name_en: str, description_it: str, description_en: str,
          ingredients_it: strArr, ingredients_en: strArr,
          price: { type: "number" },
          allergens: { type: "array", items: { type: "string", enum: ALLERGENS } },
          is_vegetarian: { type: "boolean" }, is_vegan: { type: "boolean" }, is_gluten_free: { type: "boolean" },
        },
      },
    },
  },
};

const PROMPT = `Sei un assistente che legge menu di ristoranti italiani. Estrai TUTTI i piatti e le bevande dal documento allegato.
Per ogni voce: categoria (antipasti, primi, secondi, dessert, bevande), nome e descrizione in italiano e inglese (traduci se manca una lingua; descrizione vuota se assente), ingredienti come lista breve in IT ed EN (deducili da nome/descrizione), prezzo in euro come numero (0 se assente).
Allergeni (Reg. UE 1169/2011) usando solo questi codici: ${ALLERGENS.join(", ")}. Usa quelli dichiarati nel menu; altrimenti deducili dagli ingredienti in modo prudente.
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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("Chiave API OpenAI non configurata sul server.");
    }

    const dataUrl = `data:${data.mimeType};base64,${data.base64}`;
    const isImage = data.mimeType.startsWith("image/");

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: PROMPT },
                isImage
                  ? { type: "image_url", image_url: { url: dataUrl } }
                  : { type: "text", text: `[File allegato: ${data.fileName || "menu.pdf"}]\n${dataUrl}` },
              ],
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "menu",
              strict: true,
              schema,
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Errore API OpenAI: ${response.statusText}`);
      }

      const json = await response.json();
      const text = json.choices?.[0]?.message?.content || "{}";
      const parsed = JSON.parse(text) as { dishes: ImportedDish[] };

      return { dishes: parsed.dishes, error: null as string | null };
    } catch (e) {
      console.error("extractMenu failed", e);
      const msg = e instanceof Error ? e.message : "Impossibile leggere il menu. Riprova con un file più nitido.";
      return { dishes: [] as ImportedDish[], error: msg };
    }
  });
