export function formatLocalStamp(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const HH = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const dd = pad(d.getDate());
  const MM = pad(d.getMonth() + 1);
  const yyyy = d.getFullYear();
  return `${HH}:${mm} ${dd}:${MM}:${yyyy}`;
}
