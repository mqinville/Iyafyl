export function formatRecord(
  wins: number,
  losses: number,
  ties: number,
): string {
  return ties > 0 ? `${wins}–${losses}–${ties}` : `${wins}–${losses}`
}

export function formatPoints(points: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(points)
}
