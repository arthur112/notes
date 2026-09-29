import type { Order, OrderStatus, Channel } from "@/shared/domain/orders/types/order";
import type { Customer } from "@/shared/domain/customers/types/customer";
import type { Contract } from "@/shared/domain/contracts/types/contract";
import { round2 } from "@/shared/lib/format";

/**
 * Deterministic seed data for the mock backend. Same seed → same dataset on
 * every reload; mutations are lost on refresh (this is a fake API, after all).
 */

// --- tiny seeded PRNG (mulberry32) -----------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- dictionaries -----------------------------------------------------------

const COMPANY_WORDS = [
  "Acme",
  "Aperture",
  "Atlas",
  "Beacon",
  "Blackrock",
  "Bluewave",
  "Cogent",
  "Cornerstone",
  "Crimson",
  "Cyberdyne",
  "Driftwood",
  "Echelon",
  "Ember",
  "Falcon",
  "Flux",
  "Gryphon",
  "Halcyon",
  "Harbor",
  "Ironclad",
  "Kestrel",
  "Lumen",
  "Meridian",
  "Nimbus",
  "Northwind",
  "Omni",
  "Orion",
  "Oscorp",
  "Pinnacle",
  "Quantum",
  "Redwood",
  "Sable",
  "Silverline",
  "Solstice",
  "Stellar",
  "Titan",
  "Umbra",
  "Vanguard",
  "Vertex",
  "Waypoint",
  "Zephyr",
] as const;

const PRODUCTS = [
  "Ergonomic office chair",
  "Standing desk",
  "Laptop stand",
  "Mechanical keyboard",
  '27" 4K monitor',
  "USB-C docking station",
  "Noise-cancelling headset",
  "Webcam 4K",
  "Desk lamp",
  "Cable management kit",
  "Laser printer",
  "Paper shredder",
  "Whiteboard, magnetic",
  "Ergonomic mouse",
  "Conference speaker",
  "Backup power supply",
  "Network switch 24-port",
  "Wireless access point",
  "Barcode scanner",
  "Label printer",
  "Laminator",
  "Binding machine",
  "Document camera",
  "Filing cabinet, 4-drawer",
] as const;

const COUNTRIES = [
  "Belgium",
  "Netherlands",
  "France",
  "Germany",
  "Spain",
  "Italy",
  "Portugal",
  "Ireland",
  "United Kingdom",
  "Poland",
  "Sweden",
  "Denmark",
  "Finland",
  "Austria",
  "Czechia",
  "Hungary",
  "Romania",
  "Greece",
  "United States",
  "Canada",
  "Mexico",
  "Japan",
  "Australia",
  "United Arab Emirates",
] as const;

const ORDER_STATUSES_POOL: { status: OrderStatus; weight: number }[] = [
  { status: "delivered", weight: 44 },
  { status: "shipped", weight: 17 },
  { status: "confirmed", weight: 15 },
  { status: "pending", weight: 14 },
  { status: "cancelled", weight: 10 },
];

const CHANNELS_POOL: { channel: Channel; weight: number }[] = [
  { channel: "web", weight: 35 },
  { channel: "retail", weight: 21 },
  { channel: "marketplace", weight: 18 },
  { channel: "partner", weight: 14 },
  { channel: "phone", weight: 12 },
];

// --- helpers -----------------------------------------------------------------

function pickWeighted<T extends { weight: number }>(rng: () => number, pool: readonly T[]): T {
  const total = pool.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng() * total;
  for (const item of pool) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return pool[pool.length - 1];
}

function intBetween(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function ymdFromUtcDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function isoFromUtcDate(d: Date): string {
  return d.toISOString();
}

/** A UTC instant `days` days before today at `hourUTC`:00, spread with minutes. */
function utcDayOffset(daysAgo: number, hourUTC: number, minute: number): Date {
  const now = new Date();
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo, hourUTC, minute),
  );
  return d;
}

// --- seeding -----------------------------------------------------------------

function pick(rng: () => number, items: readonly string[]): string {
  return items[Math.floor(rng() * items.length)];
}

function seedCustomers(rng: () => number): Customer[] {
  const seen = new Set<string>();
  const customers: Customer[] = [];
  for (let i = 0; i < 72; i++) {
    let name = `${pick(rng, COMPANY_WORDS)} ${pick(rng, COMPANY_WORDS)}`;
    if (seen.has(name)) name = `${name} ${intBetween(rng, 2, 99)}`;
    seen.add(name);
    customers.push({
      id: `cus_${String(i + 1).padStart(3, "0")}`,
      name,
      country: pick(rng, COUNTRIES),
    });
  }
  return customers;
}

function seedOrders(rng: () => number, customers: Customer[]): Order[] {
  const orders: Order[] = [];
  // ~26 months: keeps the dashboard's year-over-year windows fully covered for
  // any run date (a same-period-last-year window reaches at most ~731 days back).
  const horizonDays = 800;
  for (let i = 1; i <= 1200; i++) {
    const customer = customers[intBetween(rng, 0, customers.length - 1)];

    const createdAt = utcDayOffset(
      intBetween(rng, 0, horizonDays),
      intBetween(rng, 7, 21),
      intBetween(rng, 0, 59),
    );

    const dueInDays = intBetween(rng, 14, 60);
    const due = new Date(createdAt.getTime() + dueInDays * 86_400_000);
    const dueDate = ymdFromUtcDate(due);

    const status = pickWeighted(rng, ORDER_STATUSES_POOL).status;

    const itemCount = intBetween(rng, 1, 4);
    const items: Order["items"] = [];
    let subtotal = 0;
    for (let k = 0; k < itemCount; k++) {
      const quantity = intBetween(rng, 1, 8);
      const unitPrice = round2(rng() * 940 + 9);
      subtotal = round2(subtotal + quantity * unitPrice);
      items.push({
        name: pick(rng, PRODUCTS),
        quantity,
        unitPrice,
      });
    }
    const tax = round2(subtotal * 0.21);
    const total = round2(subtotal + tax);

    let paidAt: string | null = null;
    if (status === "delivered") {
      const paid = new Date(createdAt.getTime() + intBetween(rng, 1, 9) * 86_400_000);
      paidAt = isoFromUtcDate(paid);
    }

    orders.push({
      id: i,
      orderNo: `ORD-${String(100_000 + i)}`,
      customer: { id: customer.id, name: customer.name, country: customer.country },
      channel: pickWeighted(rng, CHANNELS_POOL).channel,
      status,
      items,
      subtotal,
      tax,
      total,
      currency: "EUR",
      createdAt: isoFromUtcDate(createdAt),
      dueDate,
      paidAt,
    });
  }
  return orders;
}

// --- contracts ---------------------------------------------------------------

/**
 * The seeded mortgage book — a single rich record (the Contracts app has no
 * list; its index redirects straight to this contract). Deterministic: it is
 * literal data, not PRNG output.
 */
function seedContracts(): Contract[] {
  return [
    {
      id: 1,
      contractNo: "CTR-2023-004821",
      status: "active",
      borrowerName: "Claire Dubois",
      product: "Residential mortgage",
      rateSummary: "Fixed rate 4.80%",
      outstandingPrincipal: 342_917,
      monthlyPayment: 2_248.6,
      nextDueDate: "2025-12-01",
      maturityDate: "2048-03-15",
      initial: {
        effectiveDate: "2023-03-15",
        loanTerms: {
          borrowedAmount: 385_000,
          primeMarginPct: 1.85,
          baseRateName: "Euribor 3M",
          baseRatePct: 2.95,
          nominalRatePct: 4.8,
          nominalRateKind: "fixed",
          termMonths: 300,
          monthlyInstallment: 2_205.41,
        },
        risk: {
          grade: "B+",
          gradeBand: "Upper medium",
          gradeIndex: 1,
          probabilityOfDefaultPct: 1.8,
          scoringModel: "Retail Mortgage v4.2",
          committeeDecision: "Approved",
          committeeDate: "2023-03-08",
        },
        borrower: {
          name: "Claire Dubois",
          dateOfBirth: "1985-07-12",
          ageAtSigning: 37,
          nationalId: "FR 85 069 312 4417",
          maritalStatus: "Married · joint application",
          occupation: "Product engineer · CDI since 2016",
          annualGrossIncome: 78_500,
          coBorrower: "Marc Dubois (spouse)",
        },
        collateral: {
          property: "24 Rue des Lilas, 69003 Lyon",
          appraisedValue: 450_000,
          appraisalLabel: "Feb 2023",
          ltvAtOriginationPct: 85.6,
          guarantee: "1st-rank mortgage",
          registration: "Lyon land registry",
          registrationDate: "2023-03-22",
          notary: "Étude Bertrand & Associés",
        },
      },
      current: {
        periodLabel: "November 2025",
        installmentNo: 32,
        installmentCount: 300,
        updatedAt: "2025-11-05",
        remainingTermMonths: 268,
        outstandingPrincipal: 342_917.14,
        principalChangePct: -10.9,
        nextInstallment: 2_248.6,
        nextDueDate: "2025-12-01",
        paymentMethod: "direct debit",
        daysPastDue: 0,
        scheduleLabel: "On time",
        activeClaim: {
          claimNo: "CLM-2025-0192",
          kind: "Temporary incapacity (ITT)",
          statusLabel: "under review",
          since: "2025-09-04",
          installmentsSuspended: true,
        },
        modifications: [
          {
            date: "2025-06-01",
            kind: "Rate review",
            description: "Euribor 3M 2.95% → 3.40%; installment becomes €2,248.60 from July 2025",
            agent: "L. Marchand",
          },
          {
            date: "2024-02-14",
            kind: "Early repayment",
            description: "€15,000.00 on principal; installment reduced from €2,205.41 to €2,120.16",
            agent: "K. Aubert",
          },
          {
            date: "2023-10-02",
            kind: "Deferral",
            description: "October 2023 installment deferred one month, no penalty",
            agent: "L. Marchand",
          },
        ],
      },
    },
  ];
}

export interface Db {
  orders: Order[];
  customers: Customer[];
  contracts: Contract[];
  nextOrderId: () => number;
}

let cached: Db | null = null;

export function getDb(): Db {
  if (cached) return cached;
  const rng = mulberry32(20260809);
  const customers = seedCustomers(rng);
  const orders = seedOrders(rng, customers);
  const contracts = seedContracts();
  const maxId = Math.max(...orders.map((o) => o.id), 0);
  cached = { orders, customers, contracts, nextOrderId: () => maxId + 1 };
  return cached;
}
