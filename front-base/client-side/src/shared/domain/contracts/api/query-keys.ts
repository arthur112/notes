/**
 * TanStack Query key factories — every contract cache read/write goes through
 * these so invalidation stays predictable.
 */
export const contractQueryKeys = {
  all: ["contracts"] as const,
  detail: (contractNo: string) => ["contracts", "detail", contractNo] as const,
} as const;
