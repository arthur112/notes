import { z } from "zod";

import type { Month } from "@/shared/lib/date";

/** Typed sample data used by the showcase app demos (pickers, tables, forms). */
export const sampleProjectSchema = z.object({
  id: z.number(),
  name: z.string(),
  owner: z.string(),
  month: z.object({ year: z.number(), month: z.number() }),
  status: z.enum(["planned", "in-progress", "shipped", "done"]),
  budget: z.number(),
});
export type SampleProject = z.infer<typeof sampleProjectSchema>;

const monthOf = (year: number, month: number): Month => ({ year, month });

export const SAMPLE_PROJECTS: SampleProject[] = [
  {
    id: 1,
    name: "Verdant redesign",
    owner: "Mira",
    month: monthOf(2026, 8),
    status: "in-progress",
    budget: 48000,
  },
  {
    id: 2,
    name: "Order API v2",
    owner: "Jonas",
    month: monthOf(2026, 8),
    status: "in-progress",
    budget: 61000,
  },
  {
    id: 3,
    name: "Finance exports",
    owner: "Clara",
    month: monthOf(2026, 7),
    status: "done",
    budget: 18000,
  },
  {
    id: 4,
    name: "Mobile approvals",
    owner: "Sami",
    month: monthOf(2026, 7),
    status: "shipped",
    budget: 34000,
  },
  {
    id: 5,
    name: "Customer portal",
    owner: "Mira",
    month: monthOf(2026, 6),
    status: "done",
    budget: 52000,
  },
  {
    id: 6,
    name: "Event bus demo",
    owner: "Jonas",
    month: monthOf(2026, 6),
    status: "planned",
    budget: 12000,
  },
  {
    id: 7,
    name: "Search revamp",
    owner: "Clara",
    month: monthOf(2026, 5),
    status: "shipped",
    budget: 27500,
  },
  {
    id: 8,
    name: "Dark theme audit",
    owner: "Sami",
    month: monthOf(2026, 5),
    status: "planned",
    budget: 9000,
  },
];
