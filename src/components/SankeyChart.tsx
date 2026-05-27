import { useRef, useState, useMemo, useLayoutEffect, useCallback } from 'react'
import { sankey, sankeyLeft } from 'd3-sankey'
import type { SankeyNode, SankeyLink } from 'd3-sankey'
import { buildSankeyData } from '../lib/sankeyHelpers'
import type { SkNode, SkLink } from '../lib/sankeyHelpers'
import { CATEGORY_COLORS } from '../lib/categoryColors'
import { fmt, fmtShort } from '../lib/format'
import type { AppData } from '../types'
import type { SankeyInput } from '../lib/sankeyHelpers'

type LayoutNode = SankeyNode<SkNode, SkLink> & SkNode
type LayoutLink = SankeyLink<SkNode, SkLink> & SkLink

const LABEL_W = 220   // px reserved on right for SVG text labels
const SRC_LABEL_W = 110  // px reserved on left for SVG text labels
const NODE_W = 18
const EXTRA_BOTTOM = 100  // extra container height below dims.h for dipped nodes

interface DrillDownItem {
  name: string
  amount: number
  balance?: number
  total: number
}

interface SankeyChartProps {
  input: SankeyInput
  data: AppData
  mobile?: boolean
}

export default function SankeyChart({ input, data, mobile = false }: SankeyChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [dims, setDims] = useState({ w: 800, h: 580 })
  const [activeNode, setActiveNode] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)

  // ── Measure container ──
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect
      setDims({ w: Math.max(width, 400), h: 580 })
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
      // ── Post-layout curve adjustments ──
      // Push a node down and update its ribbon endpoint so the ribbon stays
      // aligned with the moved node. 'source' updates y0 (col-0 fan-in);
      // 'target' updates y1 (col-3 fan-out).
      const applyDip = (nodeId: string, dip: number, side: 'source' | 'target') => {
        const node = g.nodes.find(n => (n as LayoutNode).id === nodeId) as LayoutNode | undefined
        if (!node) return
        node.y0 = (node.y0 ?? 0) + dip
        node.y1 = (node.y1 ?? 0) + dip
        const lnk = side === 'target'
          ? g.links.find(l => (l.target as LayoutNode).id === nodeId)
          : g.links.find(l => (l.source as LayoutNode).id === nodeId)
        const prop = side === 'target' ? 'y1' : 'y0'
        if (lnk) (lnk as any)[prop] = (lnk as any)[prop] + dip
      }

      // Cascade dips on the bottom 2 col-3 nodes. Position-based, not ID-based,
      // so retirement/overshoot/remaining are handled in any combination.
      const col3ByPos = [...g.nodes]
        .filter(n => (n as LayoutNode).col === 3)
        .sort((a, b) => (b.y0 ?? 0) - (a.y0 ?? 0))
      ;[45, 22].forEach((dip, i) => {
        if (col3ByPos[i]) applyDip((col3ByPos[i] as LayoutNode).id, dip, 'target')
      })

      // Dip the last col-0 source when there are 3+ income sources so a small
      // bottom source curves upward into gross rather than running flat.
      const col0ByPos = [...g.nodes]
        .filter(n => (n as LayoutNode).col === 0)
        .sort((a, b) => (b.y0 ?? 0) - (a.y0 ?? 0))
      if (col0ByPos.length >= 3) {
        applyDip((col0ByPos[0] as LayoutNode).id, 30, 'source')
      }
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
    <div className="flex items-center justify-center h-64 text-sm" style={{ color: 'var(--color-text-muted)' }}>
      Add your income to see the flow.
    </div>
  )

  // ── Mobile render ──
  if (mobile) {
    const taxes = input.grossMonthly - input.netMonthly
      - input.trad401kMonthly - input.hsaMonthly - input.roth401kMonthly
    const retHsa = input.trad401kMonthly + input.roth401kMonthly + input.hsaMonthly
    const showDeductionCard = taxes > 0 || retHsa > 0

    const bucketSum = input.essTotalP + input.discPlanTotal + input.debtPlanTotal
      + input.liquidSavingsMonthly + input.rothIraMonthly
    const remaining = input.netMonthly - bucketSum

    const outputs: { id: string; label: string; amount: number; color: string }[] = [
      { id: 'essentials',    label: 'Essentials',    amount: input.essTotalP,           color: CATEGORY_COLORS.essentials },
      { id: 'discretionary', label: 'Discretionary', amount: input.discPlanTotal,        color: CATEGORY_COLORS.discretionary },
      { id: 'debt',          label: 'Debt',          amount: input.debtPlanTotal,        color: CATEGORY_COLORS.debt },
      { id: 'liquid-savings',label: 'Liquid Savings',amount: input.liquidSavingsMonthly, color: CATEGORY_COLORS.liquidSavings },
      { id: 'retirement',    label: 'Retirement',    amount: input.rothIraMonthly,       color: CATEGORY_COLORS.retirement },
      ...(remaining > 1
        ? [{ id: 'remaining', label: 'Remaining', amount: remaining, color: CATEGORY_COLORS.remaining }]
        : []),
    ].filter(o => o.amount > 1)

    if (outputs.length === 0 || input.netMonthly <= 0) {
      return (
        <div className="flex items-center justify-center h-32 text-sm"
          style={{ color: 'var(--color-text-muted)' }}>
          Add your income to see the flow.
        </div>
      )
    }

    // ── Parallel-band SVG layout constants ──
    const NODE_GAP = 4
    const MIN_NODE_H = 4
    const N = outputs.length
    const totalH = Math.max(N * 30 - NODE_GAP, 160)
    const innerH = totalH - (N - 1) * NODE_GAP

    // Proportional node heights — floored at MIN_NODE_H, scaled to sum to innerH
    const rawHeights = outputs.map(o => Math.max(MIN_NODE_H, (o.amount / input.netMonthly) * innerH))
    const rawSum = rawHeights.reduce((s, h) => s + h, 0)
    const nodeHeights = rawSum > 0 ? rawHeights.map(h => (h / rawSum) * innerH) : rawHeights

    // Output node Y positions
    const nodeY: number[] = []
    let cy = 0
    nodeHeights.forEach((h, i) => {
      nodeY.push(cy)
      cy += h + (i < N - 1 ? NODE_GAP : 0)
    })

    // SVG viewport: fits a 390px screen
    const VIEW_W = 364
    const SRC_X0 = 10, SRC_X1 = 24
    const TGT_X0 = 214, TGT_X1 = 224
    const LABEL_X = 232

    return (
      <div>
        {/* ── Deduction summary card ── */}
        {showDeductionCard && (
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 5,
            padding: '12px 14px',
            marginBottom: 16,
          }}>
            {/* Gross Income row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                Gross Income
              </span>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 15, color: 'var(--color-text)', fontWeight: 600 }}>
                {fmt(input.grossMonthly)}
              </span>
            </div>
            <div style={{ borderTop: '1px solid var(--color-border)', marginBottom: 10 }} />

            {/* Taxes row */}
            {taxes > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: CATEGORY_COLORS.taxes, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Taxes</span>
                </div>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--color-text-dim)' }}>
                  − {fmt(taxes)}
                </span>
              </div>
            )}

            {/* 401(k) & HSA row */}
            {retHsa > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: CATEGORY_COLORS.retHsa, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>401(k) & HSA</span>
                </div>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--color-text-dim)' }}>
                  − {fmt(retHsa)}
                </span>
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--color-border)', marginBottom: 10 }} />

            {/* Take-Home total row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: CATEGORY_COLORS.takehome, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: CATEGORY_COLORS.takehome, fontWeight: 600 }}>Take-Home</span>
              </div>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 15, color: 'var(--color-text)', fontWeight: 600 }}>
                {fmt(input.netMonthly)}
              </span>
            </div>
          </div>
        )}

        {/* ── Take-Home fan SVG ── */}
        <svg
          width="100%"
          viewBox={`0 0 ${VIEW_W} ${totalH + 24}`}
          style={{ display: 'block', overflow: 'visible' }}
          aria-label="Take-home budget flow"
          role="img"
        >
          <defs>
            <filter id="mobile-takehome-glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Source node: Take-Home */}
          <rect
            x={SRC_X0} y={0}
            width={SRC_X1 - SRC_X0} height={totalH}
            rx={2}
            fill="#38bdf8" fillOpacity={0.13}
            stroke="#38bdf8" strokeWidth={2} strokeOpacity={0.9}
            filter="url(#mobile-takehome-glow)"
          />
          {/* Label below source node */}
          <text
            x={(SRC_X0 + SRC_X1) / 2} y={totalH + 16}
            textAnchor="middle"
            fontSize={9} fontWeight={700} fill={CATEGORY_COLORS.takehome}
            fontFamily="DM Mono, monospace" letterSpacing="0.08em"
          >
            TAKE-HOME
          </text>

          {/* Ribbons + output nodes + labels */}
          {outputs.map((o, i) => {
            const srcY0 = nodeY[i]
            const srcY1 = srcY0 + nodeHeights[i]
            const tgtY0 = nodeY[i]
            const tgtY1 = tgtY0 + nodeHeights[i]
            const mx = (SRC_X1 + TGT_X0) / 2
            const ribbonD = [
              `M${SRC_X1},${srcY0}`,
              `C${mx},${srcY0} ${mx},${tgtY0} ${TGT_X0},${tgtY0}`,
              `L${TGT_X0},${tgtY1}`,
              `C${mx},${tgtY1} ${mx},${srcY1} ${SRC_X1},${srcY1}`,
              'Z',
            ].join(' ')
            const midY = (tgtY0 + tgtY1) / 2
            const isActive = activeNode === o.id

            return (
              <g
                key={o.id}
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveNode(prev => prev === o.id ? null : o.id)}
              >
                {/* Ribbon */}
                <path
                  d={ribbonD}
                  fill={o.color}
                  fillOpacity={isActive ? 0.5 : 0.3}
                  stroke={o.color}
                  strokeWidth={0.3}
                  strokeOpacity={0.5}
                />
                {/* Output node */}
                <rect
                  x={TGT_X0} y={tgtY0}
                  width={TGT_X1 - TGT_X0} height={Math.max(nodeHeights[i], 2)}
                  rx={2}
                  fill={o.color} fillOpacity={isActive ? 0.6 : 0.3}
                  stroke={o.color} strokeWidth={isActive ? 1.5 : 0.8} strokeOpacity={0.7}
                />
                {/* Category name + amount — hidden for very small nodes to prevent overflow */}
                {nodeHeights[i] >= 12 && (
                  <>
                    <text
                      x={LABEL_X} y={midY - 5}
                      fontSize={10} fontWeight={700} fill={o.color}
                      fontFamily="DM Mono, monospace" letterSpacing="0.04em"
                    >
                      {o.label}
                    </text>
                    <text
                      x={LABEL_X} y={midY + 9}
                      fontSize={11} fontWeight={600} fill="var(--color-text)"
                      fontFamily="DM Mono, monospace"
                    >
                      {fmt(o.amount)}
                    </text>
                  </>
                )}
              </g>
            )
          })}
        </svg>

        {/* DrillDownPanel — below SVG on mobile */}
        {activeNode && (
          <div style={{ marginTop: 12 }}>
            <DrillDownPanel
              nodeId={activeNode}
              data={data}
              input={input}
              onClose={() => setActiveNode(null)}
            />
          </div>
        )}
      </div>
    )
  }

  const isOvershoot = rawNodes.some(n => n.isOvershoot)

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      {/* SVG + label overlay — extra height accommodates nodes dipped below dims.h */}
      <div ref={containerRef} style={{ flex: '1 1 0', minWidth: 0, position: 'relative', height: dims.h + EXTRA_BOTTOM }}>
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
              const stroke = isOvershoot ? '#ef4444' : '#38bdf8'
              const strokeOpacity = isOvershoot ? 0.9 : 0.95
              return (
                <rect
                  key={sn.id}
                  x={x0} y={y0}
                  width={x1 - x0} height={Math.max(y1 - y0, 2)}
                  rx={3}
                  fill="#38bdf8"
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
            const borderColor = isOvershootNode ? '#ef4444' : sn.isStructural ? '#0e7490' : sn.color
            const fillOpacity = isActive ? 0.5 : 0.25
            return (
              <rect
                key={sn.id}
                x={x0} y={y0}
                width={x1 - x0} height={Math.max(y1 - y0, 2)}
                rx={3}
                fill={sn.isStructural ? '#0e7490' : sn.color}
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
                  <text x={midX} y={nodeBottom + 17} textAnchor="middle"
                        fontSize={11} fontWeight={700} fill="var(--color-text-muted)"
                        fontFamily="DM Mono, monospace" letterSpacing="0.1em">
                    GROSS INCOME
                  </text>
                  <text x={midX} y={nodeBottom + 34} textAnchor="middle"
                        fontSize={16} fontWeight={700} fill="var(--color-text)"
                        fontFamily="DM Mono, monospace">
                    {fmt(sn.value ?? 0)}
                  </text>
                </g>
              )
            }

            if (sn.id === 'takehome') {
              return (
                <g key={`lbl-${sn.id}`}>
                  <text x={midX} y={nodeBottom + 17} textAnchor="middle"
                        fontSize={11} fontWeight={700} fill={CATEGORY_COLORS.takehome}
                        fontFamily="DM Mono, monospace" letterSpacing="0.1em">
                    TAKE-HOME
                  </text>
                  <text x={midX} y={nodeBottom + 34} textAnchor="middle"
                        fontSize={16} fontWeight={700} fill="var(--color-text)"
                        fontFamily="DM Mono, monospace">
                    {fmt(sn.value ?? 0)}
                  </text>
                </g>
              )
            }

            if (sn.col === 0) {
              return (
                <g key={`lbl-${sn.id}`}>
                  <text x={nodeLeft - 8} y={midY - 7} textAnchor="end"
                        fontSize={11} fontWeight={700} fill={sn.color}
                        fontFamily="DM Mono, monospace" letterSpacing="0.06em">
                    {sn.label}
                  </text>
                  <text x={nodeLeft - 8} y={midY + 9} textAnchor="end"
                        fontSize={13} fontWeight={600} fill="var(--color-text)"
                        fontFamily="DM Mono, monospace">
                    {fmt(sn.value ?? 0)}
                  </text>
                </g>
              )
            }

            if (sn.col === 2 || sn.col === 3) {
              return (
                <g key={`lbl-${sn.id}`}>
                  <text x={nodeRight + 8} y={midY - 7}
                        fontSize={11} fontWeight={700} fill={sn.color}
                        fontFamily="DM Mono, monospace" letterSpacing="0.05em">
                    {sn.label}
                  </text>
                  <text x={nodeRight + 8} y={midY + 9}
                        fontSize={13} fontWeight={600} fill="var(--color-text)"
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
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 11,
              color: 'var(--color-text)',
              pointerEvents: 'none',
              zIndex: 50,
              maxWidth: 220,
            }}
          >
            {tooltip.text}
          </div>
        )}
      </div>

      {activeNode && (
        <div style={{ flex: '0 0 300px', alignSelf: 'flex-start', paddingTop: 4 }}>
          <DrillDownPanel
            nodeId={activeNode}
            data={data}
            input={input}
            onClose={() => setActiveNode(null)}
          />
        </div>
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
  const hw = Math.max(((link as any).width as number ?? 2) / 2, 4)
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
    <div className="p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 5 }}>
      <div className="flex justify-between items-center mb-3">
        <div className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--color-accent)' }}>
          {nodeLabels[nodeId] ?? nodeId} — Line Items
        </div>
        <button onClick={onClose} style={{ color: 'var(--color-text-muted)', fontSize: 18, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
      </div>
      {items.length === 0 ? (
        <div className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>No items to show.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item, i) => (
            <div key={i}>
              <div className="flex justify-between items-baseline mb-0.5">
                <span className="text-[12px]" style={{ color: 'var(--color-text-dim)' }}>{item.name}</span>
                <span className="font-mono text-[12px]" style={{ color: 'var(--color-text)' }}>{fmt(item.amount)}</span>
              </div>
              {item.balance !== undefined && (
                <div className="text-[10px] mb-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  Balance: {fmt(item.balance)}
                </div>
              )}
              <div style={{ height: 3, background: 'var(--color-border)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${item.total > 0 ? Math.min(100, (item.amount / item.total) * 100) : 0}%`,
                  background: 'var(--color-accent)',
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
