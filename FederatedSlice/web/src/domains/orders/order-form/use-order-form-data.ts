import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { customerOptionsQueryOptions } from "@/api/customers";
import { isReferenceTaken, type OrderDetail } from "@/api/orders";
import { useShell } from "@/shell/shell-provider";

import { saveOrder } from "./order-form-options";

/**
 * Everything the order form reads from or writes to the server, so the form
 * itself only renders and validates:
 *
 * - `customers`: the customer picker's names (orders reference customers by name),
 *   from the session-cached options query;
 * - `save`: the write as a mutation. A problem the server returns (400
 *   validation, 404) resolves as `{ ok: false }`, so React Query sees a success
 *   and only a real failure (network down) is a mutation error. On a success it
 *   invalidates the orders queries and tells the shell's event bus;
 * - `isReferenceTaken`: the reference check, excluding the order being edited.
 */
export function useOrderFormData(order?: OrderDetail) {
  const queryClient = useQueryClient();
  const { publish } = useShell();

  const { data: customers = [] } = useQuery({
    ...customerOptionsQueryOptions(),
    select: (refs) => refs.map((customer) => customer.name),
  });

  const { mutateAsync: save } = useMutation({
    mutationFn: saveOrder,
    onSuccess: (result, { orderNo }) => {
      if (!result.ok) return;
      // Other apps (and the shell footer) hear about it through the event bus.
      publish("orders", `${orderNo ? "Updated" : "Created"} ${result.data.orderNo}`);
      // The list and the order's detail are stale now; the page we return to refetches.
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["order"] });
    },
  });

  return {
    customers,
    save,
    isReferenceTaken: (reference: string) => isReferenceTaken(reference, order?.orderNo),
  };
}
