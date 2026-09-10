import { z } from "zod";

/** Minimal customer shape used by the orders context (also what order.customer embeds). */
export const customerSchema = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string(),
});
export type Customer = z.infer<typeof customerSchema>;
