import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ImportedDish = {
  category: string;
  name_it: string; name_en: string;
  description_it: string; description_en: string;
  ingredients_it: string[]; ingredients_en: string[];
  price: number;
  allergens: string[];
  vegetarian: boolean; vegan: boolean; gluten_free: boolean;
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
        required: ["category", "name_it", "name_en", "description_it", "description_en", "ingredients_it", "ingredients_en", "price", "allergens", "vegetarian", "vegan", "gluten_free"],
        properties: {
          category: { type: "string", enum: CATEGORIES },
          name_it: str, name_en: str, description_it: str, description_en: str,
          ingredients_it: strArr, ingredients_en: strArr,
          price: { type: "number" },
          allergens: { type: "array", items: { type: "string", enum: ALLERGENS } },
          vegetarian: { type: "boolean" }, vegan: { type: "boolean" }, gluten_free: { type: "boolean" },
        },
      },
    },
  },
};

const PROMPT = `Sei un assistente che legge menu di ristoranti italiani. Estrai TUTTI i piatti e le bevande dal documento allegato.
Per ogni voce: categoria (antipasti, primi, secondi, dessert, bevande), nome e descrizione in italiano e inglese (traduci se manca una lingua; descrizione vuota se assente), ingredienti come lista breve in IT ed EN (deducili da nome/descrizione), prezzo in euro come numero (0 se assente).
Allergeni (Reg. UE 1169/2011) usando solo questi codici: ${ALLERGENS.join(", ")}. Usa quelli dichiarati nel menu; altrimenti deducili dagli ingredienti in modo prudente.
vegetarian/vegan/gluten_free: true solo se chiaramente compatibile.`;

export const extractMenu = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { fileName: string; mimeType: string; base64: string }) => {
    if (!d?.base64 || d.base64.length > 20_000_000) throw new Error("File mancante o troppo grande (max ~15MB)");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Non autorizzato");
    const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
    const dataUrl = `data:${data.mimeType};base64,${data.base64}`;
    const isImage = data.mimeType.startsWith("image/");
    try {
      const res = await generateResponse({
        model: "openai/gpt-6-astra",
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: PROMPT },
            isImage
              ? { type: "input_image", image_url: dataUrl, detail: "high" }
              : { type: "input_file", filename: data.fileName || "menu.pdf", file_data: dataUrl },
          ],
        }],
        text: { format: { type: "json_schema", name: "menu", strict: true, schema } },
      });
      const r = res as unknown as { output_text?: string; output?: { type: string; content?: { type: string; text?: string }[] }[] };
      const text = r.output_text ?? r.output?.flatMap((o) => o.content ?? []).filter((c) => c.type === "output_text").map((c) => c.text ?? "").join("") ?? "";
      const parsed = JSON.parse(text) as { dishes: ImportedDish[] };
      return { dishes: parsed.dishes, error: null as string | null };
    } catch (e) {
      console.error("extractMenu failed", e);
      const msg = e instanceof GatewayError && e.httpStatus === 402 ? "Crediti AI esauriti" : "Impossibile leggere il menu. Riprova con un file più nitido.";
      return { dishes: [] as ImportedDish[], error: msg };
    }
  });
