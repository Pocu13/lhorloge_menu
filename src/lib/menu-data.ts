import spaghettone from "@/assets/dishes/spaghettone.jpg.asset.json";
import tiramisu from "@/assets/dishes/tiramisu.jpg.asset.json";
import ravioli from "@/assets/dishes/ravioli.jpg.asset.json";
import risotto from "@/assets/dishes/risotto.jpg.asset.json";
import norma from "@/assets/dishes/norma.jpg.asset.json";
import paccheri from "@/assets/dishes/paccheri.jpg.asset.json";
import tagliere from "@/assets/dishes/tagliere.jpg.asset.json";
import gnocchetti from "@/assets/dishes/gnocchetti.jpg.asset.json";
import parmigiana from "@/assets/dishes/parmigiana.jpg.asset.json";
import burger from "@/assets/dishes/burger.jpg.asset.json";
import pizza from "@/assets/dishes/pizza.jpg.asset.json";

export type Lang = "it" | "en";
export type T = { it: string; en: string };
export type CategoryId = "antipasti" | "primi" | "secondi" | "dolci" | "bevande";

export type Dish = {
  id: string;
  category: CategoryId;
  name: T;
  tag: T;
  description: T;
  ingredients: { it: string[]; en: string[] };
  price: number;
  image?: string | undefined;
  allergens?: string[];
  signature?: { note: T; pairing: T } | undefined;
};

export const categories: { id: CategoryId; label: T }[] = [
  { id: "antipasti", label: { it: "Antipasti & Tapas", en: "Starters & Tapas" } },
  { id: "primi", label: { it: "Primi & Pizze", en: "Pasta & Pizza" } },
  { id: "secondi", label: { it: "Secondi & Burger", en: "Mains & Burgers" } },
  { id: "dolci", label: { it: "Dolci & Dessert", en: "Desserts" } },
  { id: "bevande", label: { it: "Bevande", en: "Drinks" } },
];

export const ui = {
  address: { it: "Via Santa Filomena, 42 — Catania", en: "Via Santa Filomena, 42 — Catania" },
  heroA: { it: "Ogni piatto ha", en: "Every dish has" },
  heroB: { it: "il suo tempo", en: "its own time" },
  heroSub: {
    it: "Il tempo della scelta attenta degli ingredienti, della cottura paziente, del servizio curato.",
    en: "Time for the careful choice of ingredients, for patient cooking, for attentive service.",
  },
  iconic: { it: "I Piatti Iconici", en: "Signature Dishes" },
  iconicSub: {
    it: "Dall'eccellenza del pistacchio di Bronte DOP alle cotture lente e lievitazioni di 48 ore.",
    en: "From the excellence of Bronte DOP pistachio to slow cooking and 48-hour leavening.",
  },
  fullMenu: { it: "La Carta Completa", en: "The Full Menu" },
  all: { it: "Tutti i Piatti", en: "All Dishes" },
  ingredients: { it: "Ingredienti", en: "Ingredients" },
  pairing: { it: "Abbinamento consigliato", en: "Suggested pairing" },
  details: { it: "Scopri", en: "Discover" },
  footer: {
    it: "Coperto € 2,50. Segnalate al personale eventuali allergie o intolleranze.",
    en: "Cover charge $2.70. Please inform our staff of any allergies or intolerances.",
  },
  hours: { it: "Aperti tutte le sere · 19:00 — 00:00", en: "Open every evening · 7 pm — midnight" },
} satisfies Record<string, T>;

/** EUR → USD indicative rate for the English interface. */
export const USD_RATE = 1.08;

export function formatPrice(eur: number, lang: Lang) {
  if (lang === "it") {
    return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(eur);
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Math.round(eur * USD_RATE * 2) / 2,
  );
}

const d = (x: Dish) => x;

export const dishes: Dish[] = [
  d({
    id: "tagliere", category: "antipasti", price: 18, image: tagliere.url,
    name: { it: "Tagliere L'Horloge", en: "L'Horloge Board" },
    tag: { it: "Da condividere", en: "To share" },
    description: {
      it: "Pregiata selezione salumi di suino nero dei Nebrodi e formaggi affinati, miele millefiori e mostarde artigianali, pane casereccio all'olio evo.",
      en: "Fine selection of Nebrodi black pork cured meats and aged cheeses, wildflower honey, artisan mustards and homemade bread with extra virgin olive oil.",
    },
    ingredients: {
      it: ["Salumi di suino nero", "Formaggi affinati", "Miele millefiori", "Mostarde", "Pane casereccio"],
      en: ["Black pork cold cuts", "Aged cheeses", "Wildflower honey", "Mustards", "Homemade bread"],
    },
  }),
  d({
    id: "parmigiana", category: "antipasti", price: 11, image: parmigiana.url,
    name: { it: "Parmigiana d'Estate", en: "Summer Parmigiana" },
    tag: { it: "Vegetariano", en: "Vegetarian" },
    description: {
      it: "Melanzane dorate espresse, vellutata san marzano ristretto, provola ragusana affumicata e basilico fresco su pietra lavica.",
      en: "Freshly fried golden aubergines, reduced San Marzano velouté, smoked Ragusa provola and fresh basil on lava stone.",
    },
    ingredients: {
      it: ["Melanzane", "Pomodoro San Marzano", "Provola ragusana", "Basilico"],
      en: ["Aubergine", "San Marzano tomato", "Ragusa provola", "Basil"],
    },
  }),
  d({
    id: "crostone", category: "antipasti", price: 9,
    name: { it: "Crostone Voyage", en: "Voyage Crostone" },
    tag: { it: "Tapas Calda", en: "Warm Tapas" },
    description: {
      it: "Pane di grani antichi tostato a legna, stracciatella iblea, pomodori secchi marinati all'origano selvatico e acciughe del Mar Cantabrico.",
      en: "Wood-toasted ancient grain bread, Iblei stracciatella, sun-dried tomatoes marinated with wild oregano and Cantabrian anchovies.",
    },
    ingredients: {
      it: ["Pane di grani antichi", "Stracciatella", "Pomodori secchi", "Acciughe del Cantabrico"],
      en: ["Ancient grain bread", "Stracciatella", "Sun-dried tomatoes", "Cantabrian anchovies"],
    },
  }),
  d({
    id: "potato", category: "antipasti", price: 8.5,
    name: { it: "Baked Potato al Pistacchio", en: "Pistachio Baked Potato" },
    tag: { it: "Bronte DOP", en: "Bronte DOP" },
    description: {
      it: "Patata silana al cartoccio ripassata al forno, crema morbida al pistacchio, provola fusa dei Nebrodi e granella dorata croccante.",
      en: "Sila potato baked in foil, soft pistachio cream, melted Nebrodi provola and crunchy golden crumble.",
    },
    ingredients: {
      it: ["Patata silana", "Crema di pistacchio", "Provola dei Nebrodi"],
      en: ["Sila potato", "Pistachio cream", "Nebrodi provola"],
    },
  }),
  d({
    id: "caponatina", category: "antipasti", price: 10,
    name: { it: "Caponatina Tradizionale con Cialda al Finocchietto", en: "Traditional Caponatina with Wild Fennel Wafer" },
    tag: { it: "Presidio Slow Food", en: "Slow Food Presidium" },
    description: {
      it: "Melanzane fritte, sedano croccante, capperi di Salina, olive nocellara e agrodolce al mosto cotto.",
      en: "Fried aubergines, crunchy celery, Salina capers, Nocellara olives and cooked-must sweet and sour.",
    },
    ingredients: {
      it: ["Melanzane", "Sedano", "Capperi di Salina", "Olive nocellara", "Mosto cotto"],
      en: ["Aubergine", "Celery", "Salina capers", "Nocellara olives", "Cooked grape must"],
    },
  }),
  d({
    id: "bruschette", category: "antipasti", price: 7.5,
    name: { it: "Bruschette L'Horloge ai Tre Pomodori", en: "L'Horloge Three-Tomato Bruschetta" },
    tag: { it: "Tradizione", en: "Tradition" },
    description: {
      it: "Datterino confit, costoluto di Pachino marinato e datterino giallo con fior di sale e origano dell'Etna.",
      en: "Confit datterino, marinated Pachino costoluto and yellow datterino with fleur de sel and Etna oregano.",
    },
    ingredients: {
      it: ["Datterino", "Costoluto di Pachino", "Fior di sale", "Origano dell'Etna"],
      en: ["Datterino tomato", "Pachino costoluto", "Fleur de sel", "Etna oregano"],
    },
  }),
  d({
    id: "norma", category: "primi", price: 14, image: norma.url,
    name: { it: "Norma a modo mio", en: "My Own Norma" },
    tag: { it: "Signature Dish", en: "Signature Dish" },
    description: {
      it: "Maccheroncini al bronzo, coulis di datterino cotto a bassa temperatura, chips di melanzane dorate, mousse di ricotta fresca e salata infornata.",
      en: "Bronze-drawn maccheroncini, slow-cooked datterino coulis, golden aubergine chips, fresh ricotta mousse and baked salted ricotta.",
    },
    ingredients: {
      it: ["Maccheroncini al bronzo", "Datterino", "Melanzane", "Ricotta fresca", "Ricotta infornata"],
      en: ["Bronze-drawn maccheroncini", "Datterino tomato", "Aubergine", "Fresh ricotta", "Baked ricotta"],
    },
    signature: { note: { it: "Bassa Temperatura", en: "Slow Cooked" }, pairing: { it: "Etna Rosso DOC Contrada", en: "Etna Rosso DOC Contrada" } },
  }),
  d({
    id: "pizza", category: "primi", price: 15.5, image: pizza.url,
    name: { it: "Pizza L'Horloge Contemporanea", en: "L'Horloge Contemporary Pizza" },
    tag: { it: "48h Lievitazione", en: "48h Leavening" },
    description: {
      it: "Farine siciliane macinate a pietra, fiordilatte dei Monti Iblei, mortadella di suino nero, burrata pugliese IGP, granella di pistacchio di Bronte DOP.",
      en: "Stone-ground Sicilian flours, Monti Iblei fiordilatte, black pork mortadella, Apulian IGP burrata, Bronte DOP pistachio crumble.",
    },
    ingredients: {
      it: ["Farine siciliane", "Fiordilatte", "Mortadella di suino nero", "Burrata IGP", "Pistacchio di Bronte"],
      en: ["Sicilian flours", "Fiordilatte", "Black pork mortadella", "IGP burrata", "Bronte pistachio"],
    },
    signature: { note: { it: "48h Lievitazione", en: "48h Leavening" }, pairing: { it: "Spumante Metodo Classico Etneo", en: "Etna Classic Method Sparkling" } },
  }),
  d({
    id: "gnocchetti", category: "primi", price: 13.5, image: gnocchetti.url,
    name: { it: "Gnocchetti Profumo d'Estate", en: "Summer Scent Gnocchetti" },
    tag: { it: "Fatto a Mano", en: "Handmade" },
    description: {
      it: "Gnocchetti di patate fatti a mano, pesto cremoso di basilico e pistacchio di Bronte DOP, stracciatella fresca di latte e datterini confit.",
      en: "Handmade potato gnocchetti, creamy basil and Bronte DOP pistachio pesto, fresh stracciatella and confit datterino tomatoes.",
    },
    ingredients: {
      it: ["Gnocchetti di patate", "Basilico", "Pistacchio di Bronte", "Stracciatella", "Datterini confit"],
      en: ["Potato gnocchetti", "Basil", "Bronte pistachio", "Stracciatella", "Confit datterini"],
    },
    signature: { note: { it: "14 min Espressi", en: "14 min, made to order" }, pairing: { it: "Etna Bianco Superiore", en: "Etna Bianco Superiore" } },
  }),
  d({
    id: "spaghettone", category: "primi", price: 12.5, image: spaghettone.url,
    name: { it: "Spaghettone ai Tre Pomodori dell'Etna & Ricotta Affumicata", en: "Spaghettone with Three Etna Tomatoes & Smoked Ricotta" },
    tag: { it: "Vegetariano", en: "Vegetarian" },
    description: {
      it: "Spaghetto trafilato in bronzo, trilogia di pomodoro datterino, costoluto e pizzutello, gocce di ricotta infornata al legno d'arancio.",
      en: "Bronze-drawn spaghetto, a trilogy of datterino, costoluto and pizzutello tomatoes, drops of ricotta baked over orange wood.",
    },
    ingredients: {
      it: ["Spaghettone al bronzo", "Datterino", "Costoluto", "Pizzutello", "Ricotta affumicata"],
      en: ["Bronze-drawn spaghettone", "Datterino", "Costoluto", "Pizzutello", "Smoked ricotta"],
    },
  }),
  d({
    id: "paccheri", category: "primi", price: 16, image: paccheri.url,
    name: { it: "Paccheri al Ragù Bianco di Suino Nero & Funghi di Bosco", en: "Paccheri with White Black-Pork Ragù & Wild Mushrooms" },
    tag: { it: "Territorio", en: "Local" },
    description: {
      it: "Paccheri di Gragnano, battuto di suino nero dei Nebrodi stufato al vino bianco dell'Etna, porcini e timo selvatico.",
      en: "Gragnano paccheri, Nebrodi black pork braised in Etna white wine, porcini and wild thyme.",
    },
    ingredients: {
      it: ["Paccheri di Gragnano", "Suino nero dei Nebrodi", "Porcini", "Timo selvatico"],
      en: ["Gragnano paccheri", "Nebrodi black pork", "Porcini", "Wild thyme"],
    },
  }),
  d({
    id: "risotto", category: "primi", price: 18, image: risotto.url,
    name: { it: "Risotto all'Orologio: Zafferano Etneo, Finocchietto & Battuto di Gambero", en: "Clock Risotto: Etna Saffron, Wild Fennel & Prawn Tartare" },
    tag: { it: "Specialità", en: "Speciality" },
    description: {
      it: "Carnaroli mantecato all'olio evo di Nocellara, pistilli di zafferano locale, profumo di agrumi e crudo di gambero rosso.",
      en: "Carnaroli creamed with Nocellara olive oil, local saffron threads, citrus scent and raw red prawn.",
    },
    ingredients: {
      it: ["Riso Carnaroli", "Zafferano etneo", "Finocchietto", "Gambero rosso", "Agrumi"],
      en: ["Carnaroli rice", "Etna saffron", "Wild fennel", "Red prawn", "Citrus"],
    },
  }),
  d({
    id: "ravioli", category: "primi", price: 15, image: ravioli.url,
    name: { it: "Ravioli Ripieni di Burrata con Salsa ai Pistacchi di Bronte", en: "Burrata Ravioli with Bronte Pistachio Sauce" },
    tag: { it: "Bronte DOP", en: "Bronte DOP" },
    description: {
      it: "Pasta all'uovo ripiena di burrata pugliese IGP, crema setosa di pistacchio puro e scorzetta di limone verdello.",
      en: "Egg pasta filled with Apulian IGP burrata, silky pure pistachio cream and verdello lemon zest.",
    },
    ingredients: {
      it: ["Pasta all'uovo", "Burrata IGP", "Pistacchio di Bronte", "Limone verdello"],
      en: ["Egg pasta", "IGP burrata", "Bronte pistachio", "Verdello lemon"],
    },
  }),
  d({
    id: "burger", category: "secondi", price: 17, image: burger.url,
    name: { it: "Burger Pistacchioso", en: "Pistachio Burger" },
    tag: { it: "Scottona Siciliana", en: "Sicilian Beef" },
    description: {
      it: "200g di scottona siciliana, pesto di pistacchio di Bronte, mortadella croccante, stracciatella e bun artigianale al burro.",
      en: "200g Sicilian heifer beef, Bronte pistachio pesto, crispy mortadella, stracciatella and artisan butter bun.",
    },
    ingredients: {
      it: ["Scottona 200g", "Pesto di pistacchio", "Mortadella", "Stracciatella", "Bun al burro"],
      en: ["200g heifer beef", "Pistachio pesto", "Mortadella", "Stracciatella", "Butter bun"],
    },
  }),
  d({
    id: "filetto", category: "secondi", price: 26,
    name: { it: "Filetto di Manzo al Nero d'Avola", en: "Beef Fillet with Nero d'Avola" },
    tag: { it: "Cottura Lenta", en: "Slow Cooked" },
    description: {
      it: "Filetto di manzo siciliano, riduzione di Nero d'Avola, purè di patate al burro affumicato e verdure di stagione.",
      en: "Sicilian beef fillet, Nero d'Avola reduction, smoked butter mashed potatoes and seasonal vegetables.",
    },
    ingredients: {
      it: ["Filetto di manzo", "Nero d'Avola", "Patate", "Burro affumicato"],
      en: ["Beef fillet", "Nero d'Avola", "Potatoes", "Smoked butter"],
    },
  }),
  d({
    id: "spada", category: "secondi", price: 22,
    name: { it: "Trancio di Pesce Spada alla Ghiotta", en: "Swordfish Steak alla Ghiotta" },
    tag: { it: "Mare", en: "From the Sea" },
    description: {
      it: "Pesce spada dello Stretto, pomodorini, capperi, olive e uvetta, crumble di pane agli agrumi.",
      en: "Strait of Messina swordfish, cherry tomatoes, capers, olives and raisins, citrus bread crumble.",
    },
    ingredients: {
      it: ["Pesce spada", "Pomodorini", "Capperi", "Olive", "Uvetta"],
      en: ["Swordfish", "Cherry tomatoes", "Capers", "Olives", "Raisins"],
    },
  }),
  d({
    id: "tiramisu", category: "dolci", price: 7.5, image: tiramisu.url,
    name: { it: "Tiramisù al Cucchiaio Mandorlato Etneo", en: "Etna Almond Spoon Tiramisù" },
    tag: { it: "Della Casa", en: "House Special" },
    description: {
      it: "Crema al mascarpone, savoiardi imbevuti di espresso, croccante di mandorle dell'Etna e cacao amaro.",
      en: "Mascarpone cream, espresso-soaked ladyfingers, Etna almond brittle and bitter cocoa.",
    },
    ingredients: {
      it: ["Mascarpone", "Savoiardi", "Espresso", "Mandorle dell'Etna", "Cacao"],
      en: ["
