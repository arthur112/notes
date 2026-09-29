import { useQuery } from "@tanstack/react-query";

import type { Contract } from "../types/contract";
import { fetchContract } from "./contract-api";
import { contractQueryKeys } from "./query-keys";

/**
 * Hooks for contract queries — the shared data layer the Contracts app
 * consumes. Apps stay ignorant of the wire format.
 */

/** One contract by number, for the `/apps/contracts/$contractNo` record route. */
export function useContract(contractNo: string): {
  data: Contract | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
} {
  const result = useQuery({
    queryKey: contractQueryKeys.detail(contractNo),
    queryFn: () => fetchContract(contractNo),
    staleTime: 15_000,
    retry: false,
  });
  return {
    data: result.data,
    isPending: result.isPending,
    isError: result.isError,
    error: result.error,
  };
}
