import type { SourceCalc } from '../types'
import { CATEGORY_COLORS } from './categoryColors'

export interface SkNode {
  id: string
  label: string
  color: string
  col: 0 | 1 | 2 | 3
  tooltip: string
  isStructural?: boolean
  isOvershoot?: boolean
  isFlagged?: boolean
  employerMatchAmt?: number
}

export interface SkLink {
  source: string
  target: string
  value: number
  sourceColor: string
  targetColor: string
  isFlagged?: boolean
}

export interface SankeyInput {
  grossMonthly: number
  netMonthly: number
  trad401kMonthly: number
  roth401kMonthly: number
  hsaMonthly: number
  employerMatch: number
  essTotalP: number
  discPlanTotal: number
  debtPlanTotal: number
  liquidSavingsMonthly: number
  rothIraMonthly: number
  dti: string
  housingPct: string
  savingsRate: string
  retireRate: string
  sourceCalcs: SourceCalc[]
}

function pct(value: number, denominator: number): string {
  if (denominator <= 0) return ''
  return (value / denominator * 100).toFixed(1) + '%'
}

function link(source: string, target: string, value: number, sourceColor: string, targetColor: string, isFlagged = false): SkLink {
  return { source, target, value: Math.max(0.01, value), sourceColor, targetColor, isFlagged }
}

export function buildSankeyData(input: SankeyInput): { nodes: SkNode[]; links: SkLink[] } {
  const {
    grossMonthly, netMonthly, trad401kMonthly, roth401kMonthly, hsaMonthly,
    employerMatch, essTotalP, discPlanTotal, debtPlanTotal, liquidSavingsMonthly,
    rothIraMonthly, dti, housingPct, sourceCalcs,
  } = input

  const nodes: SkNode[] = []
  const links: SkLink[] = []
  const dtiNum = parseFloat(dti)
  const housingNum = parseFloat(housingPct)

  // ── Col 0: Income sources ──
  sourceCalcs.forEach(c => {
    const color = c.src.type === 'w2' ? CATEGORY_COLORS.incomeW2 : CATEGORY_COLORS.incomeOther
    nodes.push({
      id: `src-${c.src.id}`,
      label: c.src.name,
      color,
      col: 0,
      tooltip: `${c.src.name}: $${Math.round(c.gross).toLocaleString()}/mo gross · ${pct(c.gross, grossMonthly)} of gross income`,
    })
    links.push(link(`src-${c.src.id}`, 'gross', c.gross, color, CATEGORY_COLORS.structural))
  })

  // ── Col 1: Gross ──
  nodes.push({ id: 'gross', label: 'Gross Income', color: CATEGORY_COLORS.structural, col: 1, isStructural: true, tooltip: `Total gross income: $${Math.round(grossMonthly).toLocaleString()}/mo.` })

  // ── Col 2: Pre-tax split ──
  const retHsa = trad401kMonthly + roth401kMonthly + hsaMonthly
  if (retHsa > 0) {
    nodes.push({
      id: 'ret-hsa',
      label: '401(k) & HSA',
      color: CATEGORY_COLORS.retHsa,
      col: 2,
      tooltip: `Traditional 401(k), Roth 401(k) + HSA contributions. ${pct(retHsa, grossMonthly)} of gross income.`,
      employerMatchAmt: employerMatch,
    })
    links.push(link('gross', 'ret-hsa', retHsa, CATEGORY_COLORS.structural, CATEGORY_COLORS.retHsa))
  }

  const taxes = grossMonthly - netMonthly - trad401kMonthly - hsaMonthly - roth401kMonthly
  if (taxes > 0) {
    nodes.push({ id: 'taxes', label: 'Taxes', color: CATEGORY_COLORS.taxes, col: 2, tooltip: `Federal, state, and local taxes. ${pct(taxes, grossMonthly)} of gross income.` })
    links.push(link('gross', 'taxes', taxes, CATEGORY_COLORS.structural, CATEGORY_COLORS.taxes))
  }

  nodes.push({ id: 'takehome', label: 'Take-home', color: CATEGORY_COLORS.takehome, col: 2, tooltip: `Money deposited to your bank account each month. ${pct(netMonthly, grossMonthly)} of gross income.` })
  links.push(link('gross', 'takehome', netMonthly, CATEGORY_COLORS.structural, CATEGORY_COLORS.takehome))

  // ── Col 3: Spending buckets ──
  const housingFlagged = housingNum > 28
  if (essTotalP > 0) {
    nodes.push({
      id: 'essentials', label: 'Essentials',
      color: housingFlagged ? CATEGORY_COLORS.essentialsFlagged : CATEGORY_COLORS.essentials,
      col: 3, isFlagged: housingFlagged,
      tooltip: `Fixed monthly costs — housing, utilities, groceries, insurance. ${pct(essTotalP, netMonthly)} of take-home.`,
    })
    links.push(link('takehome', 'essentials', essTotalP, CATEGORY_COLORS.takehome, housingFlagged ? CATEGORY_COLORS.essentialsFlagged : CATEGORY_COLORS.essentials, housingFlagged))
  }

  if (discPlanTotal > 0) {
    nodes.push({ id: 'discretionary', label: 'Discretionary', color: CATEGORY_COLORS.discretionary, col: 3, tooltip: `Flexible spending — dining, subscriptions, entertainment. ${pct(discPlanTotal, netMonthly)} of take-home.` })
    links.push(link('takehome', 'discretionary', discPlanTotal, CATEGORY_COLORS.takehome, CATEGORY_COLORS.discretionary))
  }

  const dtiFlagged = dtiNum >= 36
  if (debtPlanTotal > 0) {
    nodes.push({
      id: 'debt', label: 'Debt',
      color: CATEGORY_COLORS.debt,
      col: 3, isFlagged: dtiFlagged,
      tooltip: `Consumer debt payments. DTI ${dti}% · ${pct(debtPlanTotal, netMonthly)} of take-home.`,
    })
    links.push(link('takehome', 'debt', debtPlanTotal, CATEGORY_COLORS.takehome, CATEGORY_COLORS.debt, dtiFlagged))
  }

  if (liquidSavingsMonthly > 0) {
    nodes.push({ id: 'liquid-savings', label: 'Liquid Savings', color: CATEGORY_COLORS.liquidSavings, col: 3, tooltip: `Emergency fund + general savings. ${pct(liquidSavingsMonthly, netMonthly)} of take-home.` })
    links.push(link('takehome', 'liquid-savings', liquidSavingsMonthly, CATEGORY_COLORS.takehome, CATEGORY_COLORS.liquidSavings))
  }

  if (rothIraMonthly > 0) {
    nodes.push({ id: 'retirement', label: 'Retirement', color: CATEGORY_COLORS.retirement, col: 3, tooltip: `Roth IRA contribution funded from take-home. ${pct(rothIraMonthly, netMonthly)} of take-home.` })
    links.push(link('takehome', 'retirement', rothIraMonthly, CATEGORY_COLORS.takehome, CATEGORY_COLORS.retirement))
  }

  const bucketSum = essTotalP + discPlanTotal + debtPlanTotal + liquidSavingsMonthly + rothIraMonthly
  const remaining = netMonthly - bucketSum

  if (remaining > 1) {
    nodes.push({ id: 'remaining', label: 'Remaining', color: CATEGORY_COLORS.remaining, col: 3, tooltip: 'Unallocated take-home — consider assigning to savings or debt.' })
    links.push(link('takehome', 'remaining', remaining, CATEGORY_COLORS.takehome, CATEGORY_COLORS.remaining))
  } else if (remaining < -1) {
    nodes.push({ id: 'overshoot', label: 'Overshoot', color: CATEGORY_COLORS.overshoot, col: 3, isOvershoot: true, tooltip: `Spending exceeds take-home by $${Math.round(Math.abs(remaining)).toLocaleString()}/mo.` })
    links.push(link('takehome', 'overshoot', Math.abs(remaining), CATEGORY_COLORS.takehome, CATEGORY_COLORS.overshoot, true))
  }

  return { nodes, links }
}

// ── Situational read ──

interface SituationalInput {
  planSurplus: number
  dti: string
  savingsRate: string
  hasConsumerDebt: boolean
  consumerDebtBalance: number
  noIncome?: boolean
}

export interface SituationalRead {
  headline: string
  isOvershoot: boolean
}

export function computeSituationalRead(input: SituationalInput): SituationalRead {
  const { planSurplus, dti, savingsRate, hasConsumerDebt, consumerDebtBalance, noIncome } = input
  const dtiNum = parseFloat(dti)
  const srNum = parseFloat(savingsRate)
  const debtStr = consumerDebtBalance >= 1000
    ? '$' + Math.round(consumerDebtBalance / 1000) + 'k'
    : '$' + Math.round(consumerDebtBalance)

  if (noIncome || (!dtiNum && !srNum && !hasConsumerDebt && planSurplus === 0)) {
    return { headline: '', isOvershoot: false }
  }
  if (planSurplus < 0) {
    return {
      headline: `You're spending $${Math.round(Math.abs(planSurplus)).toLocaleString()}/mo more than you take home.`,
      isOvershoot: true,
    }
  }
  if (dtiNum >= 36 && srNum >= 15) {
    return {
      headline: `Strong saver carrying ${debtStr} at ${dti}% DTI. Aim some of that surplus at the debt.`,
      isOvershoot: false,
    }
  }
  if (dtiNum >= 36) {
    return {
      headline: `High debt load at ${dti}% DTI — consider redirecting discretionary cash to payoff.`,
      isOvershoot: false,
    }
  }
  if (!hasConsumerDebt && srNum >= 15) {
    return {
      headline: `Debt-free with ${savingsRate}% savings rate — keep the compounding going.`,
      isOvershoot: false,
    }
  }
  if (!hasConsumerDebt) {
    return { headline: `Debt-free — grow the savings rate toward 15%.`, isOvershoot: false }
  }
  if (srNum >= 15) {
    return { headline: `Saving ${savingsRate}% of gross income — on track.`, isOvershoot: false }
  }
  return {
    headline: `Add your income, expenses, and debts to see your full picture.`,
    isOvershoot: false,
  }
}

// ── Net-worth-positive milestone ──

interface NetWorthInput {
  savingsBalance: number
  retirementBalance: number
  monthlyContrib: number
  totalDebtBalance: number
  monthlyDebtPayment: number
}

export function computeNetWorthPositiveMonths(input: NetWorthInput): number | null {
  const { savingsBalance, retirementBalance, monthlyContrib, totalDebtBalance, monthlyDebtPayment } = input
  const totalAssets = savingsBalance + retirementBalance
  if (totalAssets >= totalDebtBalance) return null  // already positive
  if (monthlyContrib <= 0 && totalAssets <= 0) return null  // no assets, nothing growing
  if (monthlyContrib + monthlyDebtPayment <= 0) return null  // never converges

  // Linear approximation: assets(t) = totalAssets + monthlyContrib*t
  // debt(t) = totalDebtBalance - monthlyDebtPayment*t
  // Solve: totalAssets + monthlyContrib*t = totalDebtBalance - monthlyDebtPayment*t
  const rate = monthlyContrib + monthlyDebtPayment
  const gap = totalDebtBalance - totalAssets
  const months = Math.ceil(gap / rate)
  return months > 0 ? months : null
}
