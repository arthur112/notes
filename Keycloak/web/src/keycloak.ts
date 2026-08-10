import Keycloak from "keycloak-js";

export const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL,
  realm: "poc",
  clientId: "poc-spa",
});

export const API1_URL: string = import.meta.env.VITE_API1_URL;
