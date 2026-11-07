// react-scan must hook into React before react-dom loads, so the app is
// imported after it. The DEV branch (and the package) is dropped from builds.
if (import.meta.env.DEV) {
  const { scan } = await import("react-scan");
  scan();
}

await import("./app");
