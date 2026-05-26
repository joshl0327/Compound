import type { IncomeSource, FrequencyOption, SourceCalc, PayoffResult } from '../types'

export interface DataPoint { age: number; balance: number }

export function buildProjection(src: IncomeSource, sourceCalc: SourceCalc): DataPoint[] {
  const ret = src.retirement || ({} as NonNullable<IncomeSource['retirement']>)
  const currentAge = parseInt(ret.currentAge || '0')
  const targetAge = parseInt(ret.targetAge || '65')
  if (!currentAge || !targetAge || currentAge >= targetAge) return []

  const tradBalance = parseFloat(ret.traditional401kBalance || '') || 0
  const rothBalance = parseFloat(ret.roth401kBalance || '') || 0
  const iraBalance = parseFloat((ret.rothIra || { currentBalance: '' }).currentBalance || '') || 0
  const currentBalance = tradBalance + rothBalance + iraBalance

  const monthlyContrib =
    sourceCalc.trad401k + sourceCalc.roth401k + sourceCalc.match + sourceCalc.rothIra

  const points: DataPoint[] = []
  let balance = currentBalance
  for (let age = currentAge; age <= targetAge; age++) {
    points.push({ age, balance: Math.round(balance) })
    balance = balance * 1.07 + monthlyContrib * 12
  }
  return points
}

export function buildAggregateProjection(
  sources: IncomeSource[],
  sourceCalcs: SourceCalc[],
  hsaBalance: number,
  investBalance: number
): DataPoint[] {
  const primarySrc = sources.find(s => s.type === 'w2' && parseInt(s.retirement?.currentAge || '0') > 0)
  if (!primarySrc?.retirement) return []
  const currentAge = parseInt(primarySrc.retirement.currentAge || '0')
  const targetAge = parseInt(primarySrc.retirement.targetAge || '65')
  if (!currentAge || currentAge >= targetAge) return []

  const currentBalance = sources
    .filter(s => s.type === 'w2')
    .reduce((sum, src) => {
      const r = src.retirement || ({} as NonNullable<IncomeSource['retirement']>)
      return sum
        + (parseFloat(r.traditional401kBalance || '') || 0)
        + (parseFloat(r.roth401kBalance || '') || 0)
        + (parseFloat(r.rothIra?.currentBalance || '') || 0)
    }, 0) + hsaBalance + investBalance

  const monthlyContrib = sourceCalcs.reduce((s, c) => s + c.trad401k + c.roth401k + c.match + c.rothIra, 0)

  const points: DataPoint[] = []
  let balance = currentBalance
  for (let age = currentAge; age <= targetAge; age++) {
    points.push({ age, balance: Math.round(balance) })
    balance = balance * 1.07 + monthlyContrib * 12
  }
  return points
}

export function promoMonthsRemaining(promoEndDate: string): number {
  if (!promoEndDate) return 0
  const end = new Date(promoEndDate)
  const now = new Date()
  const months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth())
  return Math.max(0, months)
}

export function calcPayoffPromo(
  balance: string | number,
  promoAnnualRate: number,
  monthlyPayment: string | number,
  promoMonthsLeft: number,
  postPromoAnnualRate: number,
): PayoffResult | null {
  let b = parseFloat(balance as string) || 0
  const p = parseFloat(monthlyPayment as string) || 0
  if (b <= 0) return { months: 0, totalInterest: 0 }
  if (p <= 0) return null

  const r1 = promoAnnualRate / 100 / 12
  let totalInterest = 0, months = 0

  for (let m = 0; m < promoMonthsLeft && b > 0.01; m++) {
    const interest = b * r1
    totalInterest += interest
    b = Math.max(0, b + interest - p)
    months++
  }

  if (b <= 0.01) return { months, totalInterest: Math.max(0, totalInterest) }

  const phase2 = calcPayoff(b, postPromoAnnualRate, p)
  if (phase2) return { months: months + phase2.months, totalInterest: totalInterest + phase2.totalInterest }

  // Payment can't cover post-promo interest — simulate 120 months to show realistic accumulation
  const r2 = postPromoAnnualRate / 100 / 12
  for (let m = 0; m < 120; m++) {
    if (b <= 0.01) break
    totalInterest += b * r2
    b = b + b * r2 - p
    months++
    if (b <= 0.01) return { months, totalInterest: Math.max(0, totalInterest) }
  }
  return { months, totalInterest: Math.max(0, totalInterest) }
}

export function calcPayoff(
  balance: string | number,
  annualRate: string | number,
  monthlyPayment: string | number,
): PayoffResult | null {
  const b = parseFloat(balance as string) || 0
  const r = (parseFloat(annualRate as string) || 0) / 100 / 12
  const p = parseFloat(monthlyPayment as string) || 0
  if (b <= 0) return { months: 0, totalInterest: 0 }
  if (p <= 0) return null
  if (r === 0) return { months: Math.ceil(b / p), totalInterest: 0 }
  if (p <= b * r) return null
  const months = Math.ceil(Math.log(p / (p - r * b)) / Math.log(1 + r))
  return { months, totalInterest: Math.max(0, p * months - b) }
}

export function debtColor(index: number, total: number): string {
  const t = total <= 1 ? 0 : index / (total - 1)
  // Interpolate orange #f97316 → amber #fbbf24
  const r = Math.round(0xf9 + (0xfb - 0xf9) * t)
  const g = Math.round(0x73 + (0xbf - 0x73) * t)
  const b = Math.round(0x16 + (0x24 - 0x16) * t)
  const hex = (n: number) => n.toString(16).padStart(2, '0')
  return '#' + hex(r) + hex(g) + hex(b)
}

export function calcSourceMetrics(src: IncomeSource, freqOptions: FrequencyOption[]): SourceCalc {
  if (src.type !== 'w2') {
    const n = parseFloat(src.monthlyNet || '') || 0
    return { src, gross: n, net: n, trad401k: 0, roth401k: 0, match: 0, rothIra: 0, perYear: 12, isSimple: true }
  }
  const fo = freqOptions.find(f => f.id === src.frequency) || freqOptions[1]
  const py = fo.perYear
  const isSimple = src.mode === 'simple'
  const gross = isSimple
    ? (parseFloat(src.annualSalary || '') || 0) / 12
    : (parseFloat(src.grossPerPaycheck || '') || 0) * py / 12
  const ret = src.retirement || ({} as NonNullable<IncomeSource['retirement']>)
  let trad: number, roth: number, match: number
  if (ret.use401kPercent !== false) {
    trad = gross * (parseFloat(ret.traditional401kPct || '') || 0) / 100
    roth = gross * (parseFloat(ret.roth401kPct || '') || 0) / 100
    match = gross * (parseFloat(ret.employerMatchPct || '') || 0) / 100
  } else {
    trad = parseFloat(ret.traditional401kDollar || '') || 0
    roth = parseFloat(ret.roth401kDollar || '') || 0
    match = gross * (parseFloat(ret.employerMatchPct || '') || 0) / 100
  }
  const rothIra = parseFloat((ret.rothIra || {}).monthly || '') || 0
  let net: number
  if (isSimple) {
    net = (parseFloat(src.takeHomePerPaycheck || '') || 0) * py / 12
  } else {
    const optmo = (parseFloat(src.otherPostTax || '') || 0) * py / 12
    const useNewFields = src.taxesPerPaycheck !== undefined && src.taxesPerPaycheck !== ''
    if (useNewFields) {
      const taxesMo = (parseFloat(src.taxesPerPaycheck || '') || 0) * py / 12
      const hsaMo = (parseFloat(src.hsaPerPaycheck || '') || 0) * py / 12
      const customMo = (src.customPreTax || []).reduce((s, d) => s + (parseFloat(d.amount) || 0) * py / 12, 0)
      net = gross - trad - roth - taxesMo - hsaMo - customMo - optmo
    } else {
      const hmo = (parseFloat(src.healthInsurance || '') || 0) * py / 12
      const fmo = (parseFloat(src.fsa || '') || 0) * py / 12
      const opmo = (parseFloat(src.otherPreTax || '') || 0) * py / 12
      const fedmo = (parseFloat(src.federalTax || '') || 0) * py / 12
      const stmo = (parseFloat(src.stateTax || '') || 0) * py / 12
      net = gross - trad - hmo - fmo - opmo - fedmo - stmo - (gross * 0.0765) - roth - optmo
    }
  }
  return { src, gross, net, trad401k: trad, roth401k: roth, match, rothIra, perYear: py, isSimple }
}

export function payoffDate(months: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}
