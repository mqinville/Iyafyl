export function formatRecord(
  wins: number,
  losses: number,
  ties: number,
): string {
  return ties > 0 ? `${wins}–${losses}–${ties}` : `${wins}–${losses}`
}
