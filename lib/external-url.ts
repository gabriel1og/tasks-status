/** Normalizes an external URL, e.g. getExternalHref("github.com/org/repo"). */
export function getExternalHref(url: string | null | undefined) {
  const trimmedUrl = (url ?? "").trim();
  if (!trimmedUrl) return "";
  return /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`;
}
