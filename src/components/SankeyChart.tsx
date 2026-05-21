import { useRef, useState, useMemo, useLayoutEffect, useCallback } from 'react'
import { sankey, sankeyLeft } from 'd3-sankey'
import type { SankeyNode, SankeyLink } from 'd3-sankey'
import { buildSankeyData } from '../lib/sankeyHelpers'
import type { SkNode, SkLink } from '../lib/sankeyHelpers'
import { fmt, fmtShort } from '../lib/format'
import type { AppData } from '../types'
import type { SankeyInput } from '../lib/sankeyHelpers'

type LayoutNode = SankeyNode<SkNode, SkLink> & SkNode
type LayoutLink = SankeyLink<SkNode, SkLink> & SkLink

const LABEL_W = 220   // px reserved on right for SVG text labels
const SRC_LABEL_W = 110  // px reserved on left for SVG text labels
const NODE_W = 18

interface DrillDownItem {
  name: string
  amount: number
  balance?: number
  total: number
}

interface SankeyChartProps {
  input: SankeyInput
  data: AppData
}

export default function SankeyChart({ input, data }: SankeyChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [dims, setDims] = useState({ w: 800, h: 520 })
  const [activeNode, setActiveNode] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)

  // ── Measure container ──
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect
      setDims({ w: Math.max(width, 400), h: 520 })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── Build graph ──
  const { nodes: rawNodes, links: rawLinks } = useMemo(
    () => buildSankeyData(input),
    [input]
  )

  // ── Run d3-sankey layout ──
  const graph = useMemo(() => {
    if (dims.w === 0) return null
    const layout = sankey<SkNode, SkLink>()
      .nodeId((d) => (d as SkNode).id)
      .nodeAlign(sankeyLeft)
      .nodeWidth(NODE_W)
      .nodePadding(20)
      .nodeSort(null)
      .extent([[SRC_LABEL_W, 10], [dims.w - LABEL_W, dims.h - 10]])
    const MIN_NODE_H = 8
    try {
      const g = layout({
        nodes: rawNodes.map(n => ({ ...n })),
        links: rawLinks.map(l => ({ ...l })),
      })
      g.nodes.forEach(n => {
        if ((n.y1 ?? 0) - (n.y0 ?? 0) < MIN_NODE_H) {
          n.y1 = (n.y0 ?? 0) + MIN_NODE_H
        }
      })
      return g
    } catch {
      return null
    }
  }, [rawNodes, rawLinks, dims])


  const handleNodeClick = useCallback((nodeId: string) => {
    setActiveNode(prev => prev === nodeId ? null : nodeId)
  }, [])

  const handleMouseLeave = useCallback(() => setTooltip(null), [])

  if (!graph) return (
    <div className="flex items-center justify-center h-64 text-sm" style={{ color: '#3a5a7a' }}>
      Add your income to see the flow.
    </div>
  )

  const isOvershoot = rawNodes.some(n => n.isOvershoot)

  return (
    <div>
      {/* Card header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.1em] mb-0.5" style={{ color: '#3a5a7a' }}>Where it goes</div>
          <div className="font-display font-bold text-[15px]" style={{ color: '#e8f0f8' }}>
            {fmtShort(input.grossMonthly)}<span style={{ color: '#3a5a7a', fontWeight: 400, fontSize: 12 }}>/mo gross</span>
          </div>
        </div>
      </div>

      {/* SVG + label overlay */}
      <div ref={containerRef} style={{ position: 'relative', width: '100%', height: dims.h }}>
        <svg
          ref={svgRef}
          width="100%"
          height={dims.h}
          viewBox={`0 0 ${dims.w} ${dims.h}`}
          style={{ display: 'block', overflow: 'visible' }}
          aria-label={`Income flow from ${fmtShort(input.grossMonthly)} gross to ${rawNodes.filter(n => n.col === 3).length} spending categories`}
          role="img"
        >
          <defs>
            <filter id="takehome-glow">
              <feGaussianBlur stdDeviation="3.5" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            {graph.links.map((l, i) => {
              const sl = l as LayoutLink
              return (
                <linearGradient key={i} id={`grad-${i}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={sl.sourceColor} stopOpacity={sl.isFlagged ? 0.78 : 0.62} />
                  <stop offset="100%" stopColor={sl.targetColor} stopOpacity={sl.isFlagged ? 0.72 : 0.55} />
                </linearGradient>
              )
            })}
          </defs>

          {/* Links — filled ribbon shapes via custom path */}
          {graph.links.map((l, i) => {
            const sl = l as LayoutLink
            const d = ribbonPath(sl)
            return (
              <path
                key={i}
                d={d}
                fill={`url(#grad-${i})`}
                stroke={sl.targetColor}
                strokeWidth={0.5}
                strokeOpacity={sl.isFlagged ? 0.6 : 0.3}
                onMouseEnter={e => {
                  const src = (l.source as LayoutNode).label
                  const tgt = (l.target as LayoutNode).label
                  setTooltip({ x: e.clientX, y: e.clientY, text: `${src} → ${tgt}: ${fmt(sl.value)}/mo` })
                }}
                onMouseLeave={handleMouseLeave}
                style={{ cursor: 'default' }}
              >
                <title>{`${(l.source as LayoutNode).label} → ${(l.target as LayoutNode).label}: ${fmt(sl.value)}/mo`}</title>
              </path>
            )
          })}

          {/* Nodes */}
          {graph.nodes.map((n) => {
            const sn = n as LayoutNode
            const isActive = activeNode === sn.id
            const x0 = sn.x0 ?? 0
            const x1 = sn.x1 ?? 0
            const y0 = sn.y0 ?? 0
            const y1 = sn.y1 ?? 0
            const isOvershootNode = sn.isOvershoot
            const isTakehome = sn.id === 'takehome'
            if (isTakehome) {
              const stroke = isOvershoot ? '#ef4444' : '#60a5fa'
              const strokeOpacity = isOvershoot ? 0.9 : 0.95
              return (
                <rect
                  key={sn.id}
                  x={x0} y={y0}
                  width={x1 - x0} height={Math.max(y1 - y0, 2)}
                  rx={3}
                  fill="#60a5fa"
                  fillOpacity={0.13}
                  stroke={stroke}
                  strokeWidth={2}
                  strokeOpacity={strokeOpacity}
                  filter="url(#takehome-glow)"
                  onMouseEnter={e => setTooltip({ x: e.clientX, y: e.clientY, text: sn.tooltip })}
                  onMouseLeave={handleMouseLeave}
                >
                  <title>{`${sn.label}: ${fmt(sn.value ?? 0)}/mo`}</title>
                </rect>
              )
            }
            const borderColor = isOvershootNode ? '#ef4444' : sn.isStructural ? '#60a5fa' : sn.color
            const fillOpacity = isActive ? 0.5 : 0.25
            return (
              <rect
                key={sn.id}
                x={x0} y={y0}
                width={x1 - x0} height={Math.max(y1 - y0, 2)}
                rx={3}
                fill={sn.isStructural ? '#1a2840' : sn.color}
                fillOpacity={sn.isStructural ? 1 : fillOpacity}
                stroke={isOvershootNode ? '#ef4444' : borderColor}
                strokeWidth={isActive || isOvershootNode ? 1.5 : 0.8}
                strokeOpacity={isOvershootNode ? 0.9 : 0.5}
                style={{ cursor: sn.col === 3 || sn.col === 0 ? 'pointer' : 'default' }}
                onClick={() => (sn.col === 3 || sn.col === 0) && handleNodeClick(sn.id)}
                onMouseEnter={e => setTooltip({ x: e.clientX, y: e.clientY, text: sn.tooltip })}
                onMouseLeave={handleMouseLeave}
                tabIndex={sn.col === 3 || sn.col === 0 ? 0 : undefined}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleNodeClick(sn.id) }}
              >
                <title>{`${sn.label}: ${fmt(sn.value ?? 0)}/mo`}</title>
              </rect>
            )
          })}

          {/* Node labels — below-node for gross and take-home, midpoint-centered for all others */}
          {graph.nodes.map(n => {
            const sn = n as LayoutNode
            const midY = ((sn.y0 ?? 0) + (sn.y1 ?? 0)) / 2
            const midX = ((sn.x0 ?? 0) + (sn.x1 ?? 0)) / 2
            const nodeRight = sn.x1 ?? 0
            const nodeLeft = sn.x0 ?? 0
            const nodeBottom = sn.y1 ?? 0

            if (sn.id === 'gross') {
              return (
                <g key={`lbl-${sn.id}`}>
                  <text x={midX} y={nodeBottom + 14} textAnchor="middle"
                        fontSize={7} fontWeight={700} fill="#4a7fa5"
                        fontFamily="DM Mono, monospace" letterSpacing="0.1em">
                    GROSS INCOME
                  </text>
                  <text x={midX} y={nodeBottom + 27} textAnchor="middle"
                        fontSize={13} fontWeight={700} fill="#e8f0f8"
                        fontFamily="DM Mono, monospace">
                    {fmt(sn.value ?? 0)}
                  </text>
                </g>
              )
            }

            if (sn.id === 'takehome') {
              return (
                <g key={`lbl-${sn.id}`}>
                  <text x={midX} y={nodeBottom + 14} textAnchor="middle"
                        fontSize={7.5} fontWeight={700} fill="#60a5fa"
                        fontFamily="DM Mono, monospace" letterSpacing="0.1em">
                    TAKE-HOME
                  </text>
                  <text x={midX} y={nodeBottom + 28} textAnchor="middle"
                        fontSize={13} fontWeight={700} fill="#e8f0f8"
                        fontFamily="DM Mono, monospace">
                    {fmt(sn.value ?? 0)}
                  </text>
                </g>
              )
            }

            if (sn.col === 0) {
              return (
                <g key={`lbl-${sn.id}`}>
                  <text x={nodeLeft - 8} y={midY - 2} textAnchor="end"
                        fontSize={7} fontWeight={700} fill={sn.color}
                        fontFamily="DM Mono, monospace" letterSpacing="0.06em">
                    {sn.label.toUpperCase()}
                  </text>
                  <text x={nodeLeft - 8} y={midY + 10} textAnchor="end"
                        fontSize={10} fontWeight={600} fill="#e8f0f8"
                        fontFamily="DM Mono, monospace">
                    {fmt(sn.value ?? 0)}
                  </text>
                </g>
              )
            }

            if (sn.col === 2 || sn.col === 3) {
              return (
                <g key={`lbl-${sn.id}`}>
                  <text x={nodeRight + 8} y={midY - 2}
                        fontSize={6.5} fontWeight={700} fill={sn.color}
                        fontFamily="DM Mono, monospace" letterSpacing="0.05em">
                    {sn.label.toUpperCase()}
                  </text>
                  <text x={nodeRight + 8} y={midY + 10}
                        fontSize={9.5} fontWeight={600} fill="#e8f0f8"
                        fontFamily="DM Mono, monospace">
                    {fmt(sn.value ?? 0)}
                  </text>
                </g>
              )
            }

            // col 1 (gross) is handled above by id; no other col-1 nodes exist
            return null
          })}

        </svg>


        {/* Tooltip */}
        {tooltip && (
          <div
            style={{
              position: 'fixed',
              left: tooltip.x + 12,
              top: tooltip.y - 8,
              background: 'rgba(7,14,22,0.95)',
              border: '1px solid #1a2840',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 11,
              color: '#c9d8e8',
              pointerEvents: 'none',
              zIndex: 50,
              maxWidth: 220,
            }}
          >
            {tooltip.text}
          </div>
        )}
      </div>

      {/* Drill-down panel */}
      {activeNode && (
        <DrillDownPanel
          nodeId={activeNode}
          data={data}
          input={input}
          onClose={() => setActiveNode(null)}
        />
      )}
    </div>
  )
}

// ── Filled Sankey ribbon path ──
// sankeyLinkHorizontal() only generates a center-line curve; this draws the full filled shape.
function ribbonPath(link: LayoutLink): string {
  const source = link.source as LayoutNode
  const target = link.target as LayoutNode
  const x0 = source.x1 ?? 0
  const x1 = target.x0 ?? 0
  const y0 = (link as any).y0 as number
  const y1 = (link as any).y1 as number
  const hw = ((link as any).width as number ?? 2) / 2
  const mx = (x0 + x1) / 2
  return [
    `M${x0},${y0 - hw}`,
    `C${mx},${y0 - hw} ${mx},${y1 - hw} ${x1},${y1 - hw}`,
    `L${x1},${y1 + hw}`,
    `C${mx},${y1 + hw} ${mx},${y0 + hw} ${x0},${y0 + hw}`,
    'Z',
  ].join(' ')
}


// ── Drill-down panel ──
function DrillDownPanel({ nodeId, data, input, onClose }: {
  nodeId: string
  data: AppData
  input: SankeyInput
  onClose: () => void
}) {
  const items = useMemo((): DrillDownItem[] => {
    switch (nodeId) {
      case 'essentials': {
        const total = input.essTotalP
        return data.budget.essentials.map(e => ({
          name: e.name,
          amount: parseFloat(e.plan || e.baseline) || 0,
          total,
        }))
      }
      case 'discretionary': {
        const total = input.discPlanTotal
        return data.budget.discretionary.map(e => ({
          name: e.name,
          amount: parseFloat(e.plan || e.baseline) || 0,
          total,
        }))
      }
      case 'debt': {
        const total = input.debtPlanTotal
        return data.debts
          .filter(d => !d.isMortgage)
          .map(d => ({
            name: d.name,
            amount: parseFloat(d.planPayment || d.minPayment) || 0,
            balance: parseFloat(d.balance) || 0,
            total,
          }))
      }
      case 'liquid-savings': {
        const efAmt = parseFloat(data.savings.emergencyFund.monthly) || 0
        const genAmt = parseFloat(data.savings.generalSavings.monthly) || 0
        const total = efAmt + genAmt
        return [
          { name: 'Emergency Fund', amount: efAmt, total },
          { name: 'General Savings', amount: genAmt, total },
        ].filter(i => i.amount > 0)
      }
      case 'retirement': {
        const total = input.rothIraMonthly
        return data.income.sources
          .filter(s => s.type === 'w2' && parseFloat(s.retirement?.rothIra?.monthly || '0') > 0)
          .map(s => ({
            name: `${s.name} — Roth IRA`,
            amount: parseFloat(s.retirement!.rothIra.monthly) || 0,
            total,
          }))
      }
      default:
        return []
    }
  }, [nodeId, data, input])

  const nodeLabels: Record<string, string> = {
    essentials: 'Essentials', discretionary: 'Discretionary', debt: 'Debt',
    'liquid-savings': 'Liquid Savings', retirement: 'Retirement',
  }

  return (
    <div className="mt-3 rounded-xl p-4" style={{ background: '#060e18', border: '1px solid #1a2840' }}>
      <div className="flex justify-between items-center mb-3">
        <div className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: '#60a5fa' }}>
          {nodeLabels[nodeId] ?? nodeId} — Line Items
        </div>
        <button onClick={onClose} style={{ color: '#3a5a7a', fontSize: 18, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
      </div>
      {items.length === 0 ? (
        <div className="text-[12px]" style={{ color: '#3a5a7a' }}>No items to show.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item, i) => (
            <div key={i}>
              <div className="flex justify-between items-baseline mb-0.5">
                <span className="text-[12px]" style={{ color: '#8b9cb5' }}>{item.name}</span>
                <span className="font-mono text-[12px]" style={{ color: '#c9d8e8' }}>{fmt(item.amount)}</span>
              </div>
              {item.balance !== undefined && (
                <div className="text-[10px] mb-0.5" style={{ color: '#3a5a7a' }}>
                  Balance: {fmt(item.balance)}
                </div>
              )}
              <div style={{ height: 3, background: '#1a2840', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${item.total > 0 ? Math.min(100, (item.amount / item.total) * 100) : 0}%`,
                  background: '#60a5fa',
                  borderRadius: 2,
                }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
