/**
 * Seed catalogue. Dates are offsets (in days) from the day the seed runs, so every
 * fresh seed contains a realistic mix of past, active and upcoming vacations.
 */
export interface SeedVacation {
  destination: string;
  description: string;
  startOffset: number;
  nights: number;
  price: number;
  image: string;
}

export const seedVacations: SeedVacation[] = [
  {
    destination: "Paris, France",
    description:
      "The City of Light at its most romantic: a boutique hotel in Saint-Germain, a private Seine dinner cruise and early-entry access to the Louvre before the crowds arrive.",
    startOffset: -62,
    nights: 5,
    price: 2450,
    image: "paris.jpg",
  },
  {
    destination: "Marrakech, Morocco",
    description:
      "Stay in a restored riad in the medina, wander the souks with a local guide, and spend a night under the stars at a desert camp in the Agafay foothills.",
    startOffset: -38,
    nights: 6,
    price: 1890,
    image: "marrakech.jpg",
  },
  {
    destination: "Bali, Indonesia",
    description:
      "A private pool villa above the Ubud rice terraces, sunrise at Mount Batur, Balinese cooking classes and an afternoon at the Tirta Empul water temple.",
    startOffset: -3,
    nights: 9,
    price: 2180,
    image: "bali.jpg",
  },
  {
    destination: "Dubai, United Arab Emirates",
    description:
      "Skyline suites in Downtown Dubai, a dune safari with dinner in the desert, and the view from the 148th floor of the Burj Khalifa at golden hour.",
    startOffset: -1,
    nights: 5,
    price: 3150,
    image: "dubai.jpg",
  },
  {
    destination: "Santorini, Greece",
    description:
      "Whitewashed cave suites in Oia overlooking the caldera, a catamaran cruise to the hot springs and long sunset dinners above the Aegean Sea.",
    startOffset: 12,
    nights: 7,
    price: 2890,
    image: "santorini.jpg",
  },
  {
    destination: "Kyoto, Japan",
    description:
      "Japan's old imperial capital: a traditional ryokan with kaiseki dining, a private tea ceremony, and quiet early mornings at Fushimi Inari and Higashiyama.",
    startOffset: 19,
    nights: 8,
    price: 3640,
    image: "kyoto.jpg",
  },
  {
    destination: "Amalfi Coast, Italy",
    description:
      "Cliffside hotel in Positano, a private boat day to Capri, limoncello tasting in Amalfi and the Path of the Gods hike above the Mediterranean.",
    startOffset: 33,
    nights: 7,
    price: 3290,
    image: "amalfi.jpg",
  },
  {
    destination: "Reykjavik, Iceland",
    description:
      "Northern lights hunting in season, the Golden Circle by super-jeep, a soak in the Sky Lagoon, and the waterfalls and black-sand beaches of the south coast.",
    startOffset: 46,
    nights: 5,
    price: 2390,
    image: "iceland.jpg",
  },
  {
    destination: "Maldives",
    description:
      "An overwater villa with a private deck and lagoon access, house-reef snorkelling with manta rays, and a sandbank picnic on an uninhabited island.",
    startOffset: 58,
    nights: 7,
    price: 6950,
    image: "maldives.jpg",
  },
  {
    destination: "Banff, Canada",
    description:
      "Lakeside lodge stays at Lake Louise and Moraine Lake, a canoe at sunrise, the Icefields Parkway road trip and soaking in the Banff Upper Hot Springs.",
    startOffset: 74,
    nights: 6,
    price: 2740,
    image: "banff.jpg",
  },
  {
    destination: "Cape Town, South Africa",
    description:
      "Table Mountain at sunset, the Cape Winelands, penguins at Boulders Beach and a drive along Chapman's Peak to the Cape of Good Hope.",
    startOffset: 90,
    nights: 8,
    price: 2560,
    image: "cape-town.jpg",
  },
  {
    destination: "Machu Picchu, Peru",
    description:
      "Cusco and the Sacred Valley, the Vistadome train along the Urubamba River, and a guided sunrise visit to the Inca citadel of Machu Picchu.",
    startOffset: 108,
    nights: 7,
    price: 2980,
    image: "machu-picchu.jpg",
  },
  {
    destination: "New York City, United States",
    description:
      "A design hotel in SoHo, Broadway orchestra seats, a helicopter tour over Manhattan and sunset views from the Top of the Rock.",
    startOffset: 126,
    nights: 5,
    price: 2650,
    image: "new-york.jpg",
  },
  {
    destination: "Auckland, New Zealand",
    description:
      "The City of Sails by yacht, wine tasting on Waiheke Island, black-sand beaches at Piha and a day trip to the geothermal wonders of Rotorua.",
    startOffset: 150,
    nights: 9,
    price: 4380,
    image: "auckland.jpg",
  },
];

export interface SeedUser {
  firstName: string;
  lastName: string;
  email: string;
  role: "USER" | "ADMIN";
  /** Indexes into seedVacations that this user has liked. */
  likes: number[];
}

/** Development-only accounts. Passwords come from SEED_ADMIN_PASSWORD / SEED_USER_PASSWORD (see .env.example). */
export const seedUsers: SeedUser[] = [
  { firstName: "Ameer", lastName: "Zubedat", email: "admin@voyage.dev", role: "ADMIN", likes: [] },
  { firstName: "Maya", lastName: "Cohen", email: "user@voyage.dev", role: "USER", likes: [4, 5, 8] },
  { firstName: "Daniel", lastName: "Levi", email: "daniel@voyage.dev", role: "USER", likes: [0, 4, 6, 8, 11] },
  { firstName: "Noa", lastName: "Haddad", email: "noa@voyage.dev", role: "USER", likes: [2, 4, 5, 9, 13] },
  { firstName: "Omar", lastName: "Khalil", email: "omar@voyage.dev", role: "USER", likes: [3, 5, 6, 8, 10] },
  { firstName: "Lior", lastName: "Mizrahi", email: "lior@voyage.dev", role: "USER", likes: [1, 4, 7, 8, 12] },
];
