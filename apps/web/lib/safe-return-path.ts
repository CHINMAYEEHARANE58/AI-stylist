/** Only navigate to an internal page after login; never trust the URL query value. */
export function safeReturnPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/dashboard";
  }
  try {
    const parsed = new URL(value, "https://closetai.invalid");
    if (parsed.origin !== "https://closetai.invalid" || !parsed.pathname.startsWith("/")) {
      return "/dashboard";
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/dashboard";
  }
}
