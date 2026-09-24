const ARABIC_TO_PERSIAN: Record<string, string> = {
  ي: "ی",
  ك: "ک",
  ى: "ی",
  ة: "ه",
  أ: "ا",
  إ: "ا",
  ٱ: "ا",
  ؤ: "و",
  ئ: "ی",
};

export function normalizeFa(input: string): string {
  return Array.from(input.trim())
    .map((ch) => ARABIC_TO_PERSIAN[ch] ?? ch)
    .join("")
    .replace(/\u200c/g, "")
    .replace(/\s+/g, " ");
}

export function toman(rial: number): number {
  return rial / 10;
}

export function formatRial(n: number): string {
  return new Intl.NumberFormat("fa-IR").format(Math.round(n));
}

export function formatCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000_000_000) {
    return `${(n / 1_000_000_000_000).toFixed(2)}T`;
  }
  if (Math.abs(n) >= 1_000_000_000) {
    return `${(n / 1_000_000_000).toFixed(2)}B`;
  }
  if (Math.abs(n) >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(2)}M`;
  }
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}
