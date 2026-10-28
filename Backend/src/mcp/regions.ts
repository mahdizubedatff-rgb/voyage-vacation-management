export const REGIONS = ["Europe", "Asia", "Africa", "North America", "South America", "Oceania", "Middle East"] as const;
export type Region = (typeof REGIONS)[number];

const COUNTRIES_BY_REGION: Record<Region, string[]> = {
  Europe: [
    "albania", "austria", "belgium", "bosnia", "bulgaria", "croatia", "cyprus", "czech republic", "czechia", "denmark",
    "england", "estonia", "finland", "france", "germany", "greece", "hungary", "iceland", "ireland", "italy", "latvia",
    "lithuania", "luxembourg", "malta", "monaco", "montenegro", "netherlands", "norway", "poland", "portugal", "romania",
    "scotland", "serbia", "slovakia", "slovenia", "spain", "sweden", "switzerland", "united kingdom", "uk", "wales",
  ],
  Asia: [
    "bhutan", "cambodia", "china", "hong kong", "india", "indonesia", "japan", "laos", "malaysia", "maldives", "mongolia",
    "myanmar", "nepal", "philippines", "singapore", "south korea", "korea", "sri lanka", "taiwan", "thailand", "vietnam",
  ],
  Africa: [
    "botswana", "egypt", "ethiopia", "ghana", "kenya", "madagascar", "mauritius", "morocco", "namibia", "rwanda",
    "senegal", "seychelles", "south africa", "tanzania", "tunisia", "uganda", "zambia", "zanzibar", "zimbabwe",
  ],
  "North America": [
    "bahamas", "barbados", "belize", "canada", "costa rica", "cuba", "dominican republic", "guatemala", "jamaica",
    "mexico", "panama", "puerto rico", "united states", "usa", "hawaii",
  ],
  "South America": ["argentina", "bolivia", "brazil", "chile", "colombia", "ecuador", "galapagos", "patagonia", "peru", "uruguay"],
  Oceania: ["australia", "fiji", "french polynesia", "tahiti", "bora bora", "new zealand", "papua new guinea", "samoa"],
  "Middle East": ["bahrain", "israel", "jordan", "oman", "qatar", "saudi arabia", "turkey", "united arab emirates", "uae"],
};

const ALIASES: Record<string, Region> = {
  europe: "Europe",
  european: "Europe",
  asia: "Asia",
  asian: "Asia",
  africa: "Africa",
  african: "Africa",
  "north america": "North America",
  "central america": "North America",
  caribbean: "North America",
  "south america": "South America",
  "latin america": "South America",
  oceania: "Oceania",
  pacific: "Oceania",
  australasia: "Oceania",
  "middle east": "Middle East",
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const containsWord = (text: string, word: string) => new RegExp(`\\b${escapeRegex(word)}\\b`, "i").test(text);

/** Infers the region from a destination such as "Kyoto, Japan". Countries are checked longest-first. */
export function regionOf(destination: string): Region | "Other" {
  const text = destination.toLowerCase();
  const candidates = REGIONS.flatMap((region) => COUNTRIES_BY_REGION[region].map((country) => ({ region, country })));
  candidates.sort((a, b) => b.country.length - a.country.length);
  return candidates.find(({ country }) => containsWord(text, country))?.region ?? "Other";
}

/** Normalises user wording ("european", "Latin America") to a canonical region, or null. */
export function parseRegion(text: string): Region | null {
  const lower = text.toLowerCase();
  const aliases = Object.keys(ALIASES).sort((a, b) => b.length - a.length);
  const alias = aliases.find((key) => containsWord(lower, key));
  if (alias) return ALIASES[alias] ?? null;
  return REGIONS.find((region) => region.toLowerCase() === lower.trim()) ?? null;
}
