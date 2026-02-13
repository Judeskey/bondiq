export function startOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day;
  return new Date(d.setUTCDate(diff));
}
