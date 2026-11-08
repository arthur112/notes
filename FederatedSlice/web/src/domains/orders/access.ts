import type { Access } from "@/shell/shell-provider";

/**
 * What saving an order needs, as the API declares it on `POST` / `PUT /api/orders`
 * (`OrderEndpoints.cs`): the app's `orders.write` scope and the user's `order-editor` role.
 */
export const ORDER_WRITE: Access = { scopes: ["orders.write"], roles: ["order-editor"] };
