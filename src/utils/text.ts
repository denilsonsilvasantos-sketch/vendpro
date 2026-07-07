/**
 * Decodes HTML entities in a string (e.g., &amp; -> &, &quot; -> ", etc.)
 */
export function decodeHtmlEntities(str: string | null | undefined): string {
  if (!str) return '';
  if (!str.includes('&')) return str;
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(str, 'text/html');
    return doc.documentElement.textContent || str;
  } catch (e) {
    // Robust regex fallback for common entities
    return str
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&deg;/g, '°');
  }
}
