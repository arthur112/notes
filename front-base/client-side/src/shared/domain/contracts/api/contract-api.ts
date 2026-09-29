import { apiRequest } from "@/shared/lib/api-client";
import type { Contract } from "../types/contract";

/**
 * Contract endpoint functions — the only place that knows the wire shape.
 * (Swap the mock backend for a real API by replacing api-client's transport,
 * not these calls.)
 */

/** Single read model by its human contract number — what the detail route carries. */
export function fetchContract(contractNo: string): Promise<Contract> {
  return apiRequest("GET", `/api/contracts/${encodeURIComponent(contractNo)}`);
}
