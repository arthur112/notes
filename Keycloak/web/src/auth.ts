import { UserManager } from "oidc-client-ts";

export const userManager = new UserManager({
  authority: import.meta.env.VITE_OIDC_AUTHORITY,
  client_id: import.meta.env.VITE_OIDC_CLIENT_ID,
  redirect_uri: window.location.origin + window.location.pathname,
  post_logout_redirect_uri: window.location.origin + window.location.pathname,
  response_type: "code",
  scope: "openid profile email",
});

export const API1_URL: string = import.meta.env.VITE_API1_URL;
