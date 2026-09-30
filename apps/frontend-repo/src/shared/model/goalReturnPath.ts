/** Only local product routes can be used for a post-login return. */
export function goalReturnPath(search: string): string {
  const value = new URLSearchParams(search).get("returnTo");
  if (!value || !/^\/(goals|washing|insights)(\?|$)/.test(value) || value.includes("\\")) return "/";
  return value;
}
export function goalLoginPath(path: string): string {
  return `/login?returnTo=${encodeURIComponent(path)}`;
}
