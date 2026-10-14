export type TradeFormat = "redraft" | "dynasty"

const MISSING_RANK = 250

type Anchor = readonly [rank: number, value: number]

const CURVES: Record<TradeFormat, readonly Anchor[]> = {
  redraft: [
    [1, 100],
    [2, 96],
    [3, 91],
    [5, 82],
    [10, 64],
    [20, 45],
    [30, 32],
    [50, 16],
    [100, 3],
    [150, 1],
    [200, 1],
  ],
  dynasty: [
    [1, 100],
    [2, 98],
    [3, 95],
    [5, 89],
    [10, 77],
    [20, 63],
    [30, 52],
    [50, 35],
    [100, 13],
    [150, 5],
    [200, 2],
  ],
}

const DYNASTY_WEIGHTS: Record<string, number> = {
  RB: 1.21,
  QB: 1.088,
  TE: 0.975,
  WR: 0.79,
}
const TE_PREMIUM_WEIGHT = 1.35

// Approximation from the handoff: a multi-asset side loses 3% of its sum.
const PACKAGE_DISCOUNT = 0.97

export interface TradeSettings {
  format: TradeFormat
  tePremium: boolean
}

export interface TradeAssetInput {
  rank: number | null | undefined
  position: string | null | undefined
}

export type VerdictBand = "fair" | "slight" | "clear" | "robbery"

export interface TradeVerdict {
  gap: number
  band: VerdictBand
  winner: "me" | "them" | null
  label: string
}

export function curveValue(
  rank: number | null | undefined,
  format: TradeFormat,
): number {
  const r =
    rank === null || rank === undefined || !Number.isFinite(rank)
      ? MISSING_RANK
      : Math.max(1, Math.round(rank))
  const anchors = CURVES[format]
  const last = anchors[anchors.length - 1]
  if (r >= last[0]) {
    return last[1]
  }
  for (let i = 1; i < anchors.length; i++) {
    const [r1, v1] = anchors[i]
    if (r <= r1) {
      const [r0, v0] = anchors[i - 1]
      return v0 * Math.pow(v1 / v0, (r - r0) / (r1 - r0))
    }
  }
  return last[1]
}

export function assetValue(
  asset: TradeAssetInput,
  settings: TradeSettings,
): number {
  const curve = curveValue(asset.rank, settings.format)
  let weight = 1
  if (settings.format === "dynasty") {
    const position = asset.position ?? ""
    if (position === "TE" && settings.tePremium) {
      weight = TE_PREMIUM_WEIGHT
    } else {
      weight = DYNASTY_WEIGHTS[position] ?? 1
    }
  }
  return Math.max(1, Math.round(curve * weight))
}

export function sideTotal(values: number[]): number {
  if (values.length === 0) {
    return 0
  }
  if (values.length === 1) {
    return values[0]
  }
  const sum = values.reduce((acc, value) => acc + value, 0)
  return Math.round(sum * PACKAGE_DISCOUNT)
}

export function tradeVerdict(
  theyReceiveTotal: number,
  iReceiveTotal: number,
): TradeVerdict {
  const mean = (theyReceiveTotal + iReceiveTotal) / 2
  const gap =
    mean === 0 ? 0 : (Math.abs(theyReceiveTotal - iReceiveTotal) / mean) * 100
  const winner =
    iReceiveTotal > theyReceiveTotal
      ? "me"
      : iReceiveTotal < theyReceiveTotal
        ? "them"
        : null

  if (gap <= 8.5 || winner === null) {
    return { gap, band: "fair", winner: null, label: "Fair Trade!" }
  }
  const me = winner === "me"
  if (gap <= 17) {
    return {
      gap,
      band: "slight",
      winner,
      label: me ? "You slightly win!" : "You slightly lose!",
    }
  }
  if (gap <= 42.5) {
    return {
      gap,
      band: "clear",
      winner,
      label: me ? "You win!" : "You lose!",
    }
  }
  return {
    gap,
    band: "robbery",
    winner,
    label: me ? "You're robbing them!" : "They're robbing you!",
  }
}
