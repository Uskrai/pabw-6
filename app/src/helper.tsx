export function dateToString(formattedDate: string): string {
  const date = new Date(Date.parse(formattedDate));
  return date.toLocaleString();
}
