import { signIn } from "./shell/auth";

// react-scan must hook into React before react-dom loads, so the app is
// imported after it. The DEV branch (and the package) is dropped from builds.
if (import.meta.env.DEV) {
  const { scan } = await import("react-scan");
  scan();
}

// Signed in first: back from the login page, this also puts the requested URL back before the
// router reads it.
const user = await signIn();
const { renderApp } = await import("./app");
renderApp(user);
