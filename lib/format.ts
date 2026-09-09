// Formatadores de datas. Não mexer com `Intl.DateTimeFormat` porque ele é lento e imprevisível, e não tem como forçar o formato que queremos.

export function formatDate(iso: string): string {
  if (!iso) return "";

  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return "";

  return `${d}/${m}/${y}`;
}
