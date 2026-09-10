import { z } from "zod";

/**
 * The record page's mutually exclusive workflows (UxGuide §3). These are the
 * tabs, and the active one is mirrored into the URL (`?tab=…`) so a tab is a
 * shareable, Back-friendly location — not just component state.
 */
export const ORDER_DETAIL_TABS = ["details", "items", "activity"] as const;
export type OrderDetailTab = (typeof ORDER_DETAIL_TABS)[number];

export const DEFAULT_ORDER_DETAIL_TAB: OrderDetailTab = "details";

/** Invalid/absent `?tab=` falls back to the default instead of throwing. */
export const orderDetailSearchSchema = z.object({
  tab: z.enum(ORDER_DETAIL_TABS).optional().catch(undefined),
});
