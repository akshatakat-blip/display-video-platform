/**
 * Brand URL: accept www.xx.com, xx.com, https://www.xx.com.
 * Normalize for display: strip protocol and trailing slashes → "xx.com".
 * Validate that it looks like a domain (do not require protocol).
 */
export function normalizeBrandUrlForDisplay(input: string | null | undefined): string {
  if (!input || !input.trim()) return '';
  let s = input.trim();
  try {
    if (!/^https?:\/\//i.test(s)) {
      s = 'https://' + s;
    }
    const u = new URL(s);
    const host = u.hostname.replace(/^www\./i, '');
    return host || '';
  } catch {
    return input.trim();
  }
}

/** Check if string looks like a domain (for validation; do not reject missing protocol). */
export function isValidBrandUrlLike(input: string | null | undefined): boolean {
  if (!input || !input.trim()) return true;
  const normalized = normalizeBrandUrlForDisplay(input);
  return normalized.length > 0;
}
