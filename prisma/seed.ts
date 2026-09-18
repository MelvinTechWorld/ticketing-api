import { PrismaClient, EventCategory, EventStatus, BookingStatus } from "@prisma/client";
import { faker } from "@faker-js/faker";

faker.seed(42);

const prisma = new PrismaClient();

// ── helpers ──────────────────────────────────────────────────────────

const pad = (n: number, width: number) => String(n).padStart(width, "0");

const NIGERIAN_CITIES = [
  "Lagos",
  "Abuja",
  "Port Harcourt",
  "Kano",
  "Ibadan",
  "Benin City",
  "Kaduna",
  "Enugu",
  "Calabar",
  "Abeokuta",
  "Uyo",
  "Warri",
  "Jos",
  "Ilorin",
  "Owerri",
  "Akure",
  "Asaba",
  "Ado-Ekiti",
  "Maiduguri",
  "Sokoto",
];

const VENUE_PREFIXES = [
  "The Grand",
  "Royal",
  "Imperial",
  "Majestic",
  "Golden",
  "Heritage",
  "Prestige",
  "Emerald",
  "Crystal",
  "Platinum",
];

const VENUE_SUFFIXES = [
  "Arena",
  "Convention Centre",
  "Event Hall",
  "Amphitheatre",
  "Pavilion",
  "Dome",
  "Gardens",
  "Stadium",
  "Centre",
  "Coliseum",
];

const CATEGORIES = Object.values(EventCategory);

const TITLE_TEMPLATES: Record<EventCategory, string[]> = {
  CONCERT: [
    "Afrobeats Live",
    "Naija Sounds Festival",
    "Highlife Night",
    "Afro Fusion Fest",
    "Juju Revival Tour",
    "Amapiano Vibes",
    "Afropop Extravaganza",
    "Melody Nights",
    "Rhythm & Soul Concert",
    "Beat Nation Live",
  ],
  COMEDY: [
    "Laugh Out Loud",
    "Comedy Fiesta",
    "Stand-Up Saturdays",
    "The Comedy Club",
    "Jokes & Vibes",
    "Night of a Thousand Laughs",
    "Ha-Ha Hour",
    "Comic Relief Live",
    "Funny Bones Show",
    "Giggle Fest",
  ],
  CONFERENCE: [
    "TechConnect Summit",
    "Africa Innovation Forum",
    "Digital Leaders Conference",
    "StartUp Grind",
    "DevFest Nigeria",
    "Future of Work Summit",
    "FinTech Africa",
    "Cloud Africa Conference",
    "AI & Data Summit",
    "Product Conference",
  ],
  SPORTS: [
    "Lagos City Marathon",
    "Football Legends Cup",
    "Boxing Night Special",
    "Athletics Grand Prix",
    "Basketball Showdown",
    "Wrestling Championship",
    "Tennis Open",
    "Cricket Invitational",
    "Swimming Gala",
    "Volleyball Challenge",
  ],
  THEATRE: [
    "The King's Court",
    "Tales by Moonlight Live",
    "Drama at Dusk",
    "Stage Whispers",
    "The Lagos Players",
    "Oba's Palace",
    "Echoes of the Past",
    "Spotlight Theatre",
    "Curtain Call",
    "A Midsummer Night",
  ],
};

// ── main ─────────────────────────────────────────────────────────────

async function main() {
  // ── Venues ───────────────────────────────────────────────────────
  const venueIds: string[] = [];

  for (let i = 0; i < 40; i++) {
    const id = `venue-${pad(i + 1, 3)}`;
    const city = NIGERIAN_CITIES[i % NIGERIAN_CITIES.length];
    const name = `${VENUE_PREFIXES[i % VENUE_PREFIXES.length]} ${VENUE_SUFFIXES[i % VENUE_SUFFIXES.length]}`;

    await prisma.venue.upsert({
      where: { id },
      update: {},
      create: {
        id,
        name,
        city,
        address: faker.location.streetAddress(),
        capacity: faker.number.int({ min: 200, max: 5000 }),
      },
    });

    venueIds.push(id);
  }

  console.log(`✔ Seeded 40 venues`);

  // ── Events ───────────────────────────────────────────────────────
  const now = new Date();
  const sixMonthsMs = 180 * 24 * 60 * 60 * 1000;
  const eventIds: string[] = [];
  const eventCategories: EventCategory[] = [];

  for (let i = 0; i < 400; i++) {
    const id = `event-${pad(i + 1, 4)}`;
    const venueId = venueIds[faker.number.int({ min: 0, max: venueIds.length - 1 })];
    const category = CATEGORIES[faker.number.int({ min: 0, max: CATEGORIES.length - 1 })];
    const titles = TITLE_TEMPLATES[category];
    const title = titles[faker.number.int({ min: 0, max: titles.length - 1 })];
    const durationHours = faker.number.int({ min: 2, max: 4 });

    // Determine status: ~5 % CANCELLED, ~5 % COMPLETED, rest SCHEDULED
    let status: EventStatus;
    let startsAt: Date;

    const roll = faker.number.int({ min: 1, max: 100 });

    if (roll <= 5) {
      // COMPLETED — must be in the past
      status = EventStatus.COMPLETED;
      startsAt = new Date(now.getTime() - faker.number.int({ min: 1, max: 90 }) * 24 * 60 * 60 * 1000);
    } else if (roll <= 10) {
      status = EventStatus.CANCELLED;
      startsAt = new Date(now.getTime() + faker.number.int({ min: 1, max: 180 }) * 24 * 60 * 60 * 1000);
    } else {
      status = EventStatus.SCHEDULED;
      startsAt = new Date(now.getTime() + faker.number.int({ min: 1, max: 180 }) * 24 * 60 * 60 * 1000);
    }

    const endsAt = new Date(startsAt.getTime() + durationHours * 60 * 60 * 1000);

    await prisma.event.upsert({
      where: { id },
      update: {},
      create: {
        id,
        venueId,
        title,
        category,
        description: faker.lorem.sentences(2),
        startsAt,
        endsAt,
        status,
      },
    });

    eventIds.push(id);
    eventCategories.push(category);
  }

  console.log(`✔ Seeded 400 events`);

  // ── Ticket Tiers ─────────────────────────────────────────────────
  const TIER_NAMES = ["Early Bird", "Regular", "VIP"] as const;
  // Price multipliers so Early Bird < Regular < VIP
  const PRICE_MULTIPLIERS = [1.0, 1.6, 2.8];

  interface TierInfo {
    id: string;
    priceMinor: number;
    quantityTotal: number;
    quantitySold: number;
  }

  const tierInfos: TierInfo[] = [];
  let tierIndex = 0;

  for (let e = 0; e < 400; e++) {
    const eventId = eventIds[e];
    // Base price for this event's Early Bird tier (200000 – 1785000 kobo range keeps VIP ≤ 5000000)
    const basePrice = faker.number.int({ min: 200000, max: 1785000 });

    for (let t = 0; t < 3; t++) {
      tierIndex++;
      const id = `tier-${pad(tierIndex, 4)}`;
      const priceMinor = Math.round(basePrice * PRICE_MULTIPLIERS[t]);
      const quantityTotal = faker.number.int({ min: 50, max: 500 });

      // Ensure at least the first 10 tiers are fully sold out
      let quantitySold: number;
      if (tierIndex <= 10) {
        quantitySold = quantityTotal;
      } else {
        quantitySold = faker.number.int({ min: 0, max: quantityTotal });
      }

      await prisma.ticketTier.upsert({
        where: { id },
        update: {},
        create: {
          id,
          eventId,
          name: TIER_NAMES[t],
          priceMinor,
          currency: "NGN",
          quantityTotal,
          quantitySold,
        },
      });

      tierInfos.push({ id, priceMinor, quantityTotal, quantitySold });
    }
  }

  console.log(`✔ Seeded 1200 ticket tiers (${tierInfos.filter((t) => t.quantitySold === t.quantityTotal).length} sold out)`);

  // ── Bookings ─────────────────────────────────────────────────────
  for (let i = 0; i < 800; i++) {
    const id = `booking-${pad(i + 1, 4)}`;
    const tier = tierInfos[faker.number.int({ min: 0, max: tierInfos.length - 1 })];
    const quantity = faker.number.int({ min: 1, max: 10 });
    const totalMinor = tier.priceMinor * quantity;
    const reference = `BK-${pad(i + 1, 4)}`;

    const roll = faker.number.int({ min: 1, max: 100 });
    const status: BookingStatus = roll <= 10 ? BookingStatus.CANCELLED : BookingStatus.CONFIRMED;

    await prisma.booking.upsert({
      where: { id },
      update: {},
      create: {
        id,
        tierId: tier.id,
        customerName: faker.person.fullName(),
        customerEmail: faker.internet.email(),
        quantity,
        totalMinor,
        currency: "NGN",
        status,
        reference,
      },
    });
  }

  console.log(`✔ Seeded 800 bookings`);

  // ── Summary ──────────────────────────────────────────────────────
  const [venues, events, tiers, bookings] = await Promise.all([
    prisma.venue.count(),
    prisma.event.count(),
    prisma.ticketTier.count(),
    prisma.booking.count(),
  ]);

  console.log(`\n🎉 Done! Totals → Venues: ${venues}, Events: ${events}, Tiers: ${tiers}, Bookings: ${bookings}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
