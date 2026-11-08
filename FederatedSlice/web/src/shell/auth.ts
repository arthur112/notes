import { UserManager, type User } from "oidc-client-ts";

/**
 * Sign-in: authorization code + PKCE against Keycloak (realm `federated`, public client
 * `federated-shell`). The access token goes on every API call (`api/http.ts`); the API checks
 * its scopes and roles. The tokens stay in sessionStorage (oidc-client-ts's default store) and
 * are renewed with the refresh token before they expire.
 */

/** The API's scopes (`src/Api/Auth/Scopes.cs`); the shell requests all of them. */
export const SCOPES = ["customers.read", "orders.read", "orders.write"] as const;

let manager: UserManager | undefined;

/** Created on first use, so importing this module (the API client, its tests) has no side effect. */
export function userManager(): UserManager {
  manager ??= new UserManager({
    authority: import.meta.env.VITE_OIDC_AUTHORITY,
    client_id: import.meta.env.VITE_OIDC_CLIENT_ID,
    redirect_uri: `${window.location.origin}/`,
    post_logout_redirect_uri: `${window.location.origin}/`,
    scope: `openid profile email ${SCOPES.join(" ")}`,
    automaticSilentRenew: true,
  });
  return manager;
}

/** Where to come back to after the identity provider's login page. */
const here = () => window.location.pathname + window.location.search;

/**
 * Runs before the shell renders, so no app ever sees a signed-out state. Back from the login
 * page (`?code=…&state=…`), it finishes the code exchange and restores the URL the user asked
 * for; otherwise it reuses the stored session, or leaves for the login page (never resolves).
 */
export async function signIn(): Promise<User> {
  const params = new URLSearchParams(window.location.search);
  if (params.has("code") && params.has("state")) {
    const user = await userManager().signinRedirectCallback();
    window.history.replaceState(null, "", typeof user.state === "string" ? user.state : "/");
    return user;
  }
  const user = await userManager().getUser();
  if (user && !user.expired) return user;
  return redirectToLogin();
}

/** Leaves for the login page; the returned promise never settles. */
export async function redirectToLogin(): Promise<never> {
  await userManager().signinRedirect({ state: here() });
  return new Promise<never>(() => {});
}

export async function accessToken(): Promise<string | undefined> {
  return (await userManager().getUser())?.access_token;
}
