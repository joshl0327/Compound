import type { SourceCalc } from '../types'

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

const STRUCTURAL = '#1a2840'

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
    const color = c.src.type === 'w2' ? '#60a5fa' : '#a78bfa'
    nodes.push({
      id: `src-${c.src.id}`,
      label: c.src.name,
      color,
      col: 0,
      tooltip: `${c.src.name}: $${Math.round(c.gross).toLocaleString()}/mo gross`,
    })
    links.push(link(`src-${c.src.id}`, 'gross', c.gross, color, STRUCTURAL))
  })

  // ── Col 1: Gross ──
  nodes.push({ id: 'gross', label: 'Gross Income', color: STRUCTURAL, col: 1, isStructural: true, tooltip: 'Total gross income before any deductions.' })

  // ── Col 2: Pre-tax split ──
  const pretaxRet = trad401kMonthly + hsaMonthly
  if (pretaxRet > 0) {
    nodes.push({
      id: 'pretax-ret',
      label: 'Pre-tax Retirement',
      color: '#a78bfa',
      col: 2,
      tooltip: 'Traditional 401(k) + HSA contributions (pre-tax, reduce taxable income).',
      employerMatchAmt: employerMatch,
    })
    links.push(link('gross', 'pretax-ret', pretaxRet, STRUCTURAL, '#a78bfa'))
  }

  if (roth401kMonthly > 0) {
    nodes.push({ id: 'roth401k', label: 'Roth 401(k)', color: '#7c3aed', col: 2, tooltip: 'Roth 401(k) payroll deduction — post-tax but removed before take-home.' })
    links.push(link('gross', 'roth401k', roth401kMonthly, STRUCTURAL, '#7c3aed'))
  }

  const taxes = grossMonthly - netMonthly - trad401kMonthly - hsaMonthly - roth401kMonthly
  if (taxes > 0) {
    nodes.push({ id: 'taxes', label: 'Taxes', color: '#3a5a7a', col: 2, tooltip: 'Federal, state, and local taxes estimated from your paycheck data.' })
    links.push(link('gross', 'taxes', taxes, STRUCTURAL, '#3a5a7a'))
  }

  nodes.push({ id: 'takehome', label: 'Take-home', color: '#60a5fa', col: 2, isStructural: true, tooltip: 'Money deposited to your bank account each month.' })
  links.push(link('gross', 'takehome', netMonthly, STRUCTURAL, '#60a5fa'))

  // ── Col 3: Spending buckets ──
  const housingFlagged = housingNum > 28
  if (essTotalP > 0) {
    nodes.push({
      id: 'essentials', label: 'Essentials',
      color: housingFlagged ? '#f97316' : '#60a5fa',
      col: 3, isFlagged: housingFlagged,
      tooltip: 'Fixed monthly costs — housing, utilities, groceries, insurance.',
    })
    links.push(link('takehome', 'essentials', essTotalP, '#60a5fa', housingFlagged ? '#f97316' : '#60a5fa', housingFlagged))
  }

  if (discPlanTotal > 0) {
    nodes.push({ id: 'discretionary', label: 'Discretionary', color: '#fbbf24', col: 3, tooltip: 'Flexible spending — dining, subscriptions, entertainment.' })
    links.push(link('takehome', 'discretionary', discPlanTotal, '#60a5fa', '#fbbf24'))
  }

  const dtiFlagged = dtiNum >= 36
  if (debtPlanTotal > 0) {
    nodes.push({
      id: 'debt', label: 'Debt',
      color: dtiFlagged ? '#f97316' : '#60a5fa',
      col: 3, isFlagged: dtiFlagged,
      tooltip: `Consumer debt payments. Total DTI: ${dti}%.`,
    })
    links.push(link('takehome', 'debt', debtPlanTotal, '#60a5fa', dtiFlagged ? '#f97316' : '#60a5fa', dtiFlagged))
  }

  if (liquidSavingsMonthly > 0) {
    nodes.push({ id: 'liquid-savings', label: 'Liquid Savings', color: '#10b981', col: 3, tooltip: 'Emergency fund + general savings contributions.' })
    links.push(link('takehome', 'liquid-savings', liquidSavingsMonthly, '#60a5fa', '#10b981'))
  }

  if (rothIraMonthly > 0) {
    nodes.push({ id: 'retirement', label: 'Retirement', color: '#a78bfa', col: 3, tooltip: 'Roth IRA contribution funded from take-home income.' })
    links.push(link('takehome', 'retirement', rothIraMonthly, '#60a5fa', '#a78bfa'))
  }

  const bucketSum = essTotalP + discPlanTotal + debtPlanTotal + liquidSavingsMonthly + rothIraMonthly
  const remaining = netMonthly - bucketSum

  if (remaining > 1) {
    nodes.push({ id: 'remaining', label: 'Remaining', color: '#3a5a7a', col: 3, tooltip: 'Unallocated take-home — consider assigning to savings or debt.' })
    links.push(link('takehome', 'remaining', remaining, '#60a5fa', '#3a5a7a'))
  } else if (remaining < -1) {
    nodes.push({ id: 'overshoot', label: 'Overshoot', color: '#ef4444', col: 3, isOvershoot: true, tooltip: `Spending exceeds take-home by $${Math.round(Math.abs(remaining)).toLocaleString()}/mo.` })
    links.push(link('takehome', 'overshoot', Math.abs(remaining), '#60a5fa', '#ef4444', true))
  }

  return { nodes, links }
}

export function buildSankeyDataCollapsed(input: SankeyInput): { nodes: SkNode[]; links: SkLink[] } {
  const expanded = buildSankeyData(input)
  const col0Collapsed: SkNode = {
    id: 'total-income',
    label: 'Total Income',
    color: '#60a5fa',
    col: 0,
    tooltip: 'Combined gross income from all sources.',
  }
  const nonCol0 = expanded.nodes.filter(n => n.col !== 0)
  const nonSrcLinks = expanded.links.filter(l => l.target !== 'gross')
  const grossLink: SkLink = {
    source: 'total-income',
    target: 'gross',
    value: input.grossMonthly,
    sourceColor: '#60a5fa',
    targetColor: STRUCTURAL,
  }
  return { nodes: [col0Collapsed, ...nonCol0], links: [grossLink, ...nonSrcLinks] }
}

// ── Label collision avoidance ──
export interface LabelPos {
  nodeId: string
  top: number  // CSS px from top of SVG container
}

const MIN_LABEL_H = 44

export function computeLabelPositions(
  nodes: { id: string; y0: number; y1: number }[],
  pxPerViewboxUnit: number,
  containerHeight = 9999,
): LabelPos[] {
  const positions = nodes.map(n => ({
    nodeId: n.id,
    top: ((n.y0 + n.y1) / 2) * pxPerViewboxUnit - MIN_LABEL_H / 2,
  }))
  positions.sort((a, b) => a.top - b.top)

  // Forward pass — push down
  for (let i = 1; i < positions.length; i++) {
    const prev = positions[i - 1]
    if (positions[i].top < prev.top + MIN_LABEL_H) {
      positions[i].top = prev.top + MIN_LABEL_H
    }
  }

  // Backward pass — clamp last label to container, then pull earlier labels up
  const last = positions.length - 1
  if (positions[last]) {
    positions[last].top = Math.min(positions[last].top, containerHeight - MIN_LABEL_H)
    for (let i = last - 1; i >= 0; i--) {
      if (positions[i].top > positions[i + 1].top - MIN_LABEL_H) {
        positions[i].top = positions[i + 1].top - MIN_LABEL_H
      }
    }
  }

  return positions
}
