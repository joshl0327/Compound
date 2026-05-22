import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { fmtShort } from '../lib/format'

interface DataPoint { age: number; balance: number }

export interface Benchmark {
  age: number
  value: number
  label: string
}

interface LineChartProps {
  data: DataPoint[]
  height?: number
  benchmarks?: Benchmark[]
  badgeOverlay?: ReactNode
}

export default function LineChart({ data, height: h = 200, benchmarks, badgeOverlay }: LineChartProps) {
  const w = 400
  const pad = { t: 10, r: 30, b: 30, l: 55 }
  const chartW = w - pad.l - pad.r
  const chartH = h - pad.t - pad.b
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  if (!data || data.length < 2) {
    return <div className="text-muted text-[13px] text-center py-10">Enter your age and target age to see projections</div>
  }

  const maxVal = Math.max(...data.map(d => d.balance), ...(benchmarks ?? []).map(b => b.value)) || 1
  const minAge = data[0].age
  const maxAge = data[data.length - 1].age
  const ageRange = maxAge - minAge || 1
  const xStep = chartW / (data.length - 1)

  const points = data.map((d, i) =>
    `${pad.l + i * xStep},${pad.t + chartH - (d.balance / maxVal) * chartH}`
  ).join(' ')

  const fillPoints = [
    `${pad.l},${pad.t + chartH}`,
    ...data.map((_, i) => `${pad.l + i * xStep},${pad.t + chartH - (data[i].balance / maxVal) * chartH}`),
    `${pad.l + chartW},${pad.t + chartH}`,
  ].join(' ')

  const visibleBenchmarks = (benchmarks ?? []).filter(b =>
    b.age >= minAge && b.age <= maxAge && b.value <= maxVal
  )

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const svgX = (e.clientX - rect.left) * (w / rect.width)
    const idx = Math.round((svgX - pad.l) / xStep)
    setHoverIdx(Math.max(0, Math.min(data.length - 1, idx)))
  }

  const hd = hoverIdx !== null ? data[hoverIdx] : null
  const hx = hoverIdx !== null ? pad.l + hoverIdx * xStep : 0
  const hy = hd ? pad.t + chartH - (hd.balance / maxVal) * chartH : 0
  const tipLeft = hx > w * 0.6
  const tipY = Math.max(pad.t + 2, hy - 30)

  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${w} ${h}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
        style={{ cursor: 'crosshair', display: 'block' }}
      >
        <defs>
          <linearGradient id="retirementGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 1, 2, 3, 4].map(i => {
          const v = Math.round((maxVal / 4) * i)
          const y = pad.t + chartH - (v / maxVal) * chartH
          return (
            <g key={i}>
              <line x1={pad.l} y1={y} x2={pad.l + chartW} y2={y} stroke="#1a2840" strokeWidth={1} strokeDasharray="4 4" />
              <text x={pad.l - 4} y={y + 4} textAnchor="end" fontSize={9} fill="#5a7a9a">{fmtShort(v)}</text>
            </g>
          )
        })}

        {/* Fidelity benchmark lines */}
        {visibleBenchmarks.map(b => {
          const y = pad.t + chartH - (b.value / maxVal) * chartH
          const x = pad.l + ((b.age - minAge) / ageRange) * chartW
          return (
            <g key={b.label}>
              <line
                x1={pad.l} y1={y} x2={pad.l + chartW} y2={y}
                stroke="#3a5a7a" strokeWidth={1} strokeDasharray="3 4" opacity={0.5}
              />
              <text x={pad.l + chartW - 2} y={y - 3} textAnchor="end" fontSize={8} fill="#3a5a7a">
                {b.label}
              </text>
              <line x1={x} y1={pad.t + chartH} x2={x} y2={pad.t + chartH + 4} stroke="#3a5a7a" strokeWidth={1} opacity={0.5} />
            </g>
          )
        })}

        {/* Age labels */}
        {data
          .filter((d, i) => i === 0 || i === data.length - 1 || d.age % 10 === 0)
          .map(d => {
            const idx = data.indexOf(d)
            return (
              <text key={'x' + idx} x={pad.l + idx * xStep} y={h - 6} textAnchor="middle" fontSize={9} fill="#5a7a9a">
                {d.age}
              </text>
            )
          })}

        {/* Main line + fill */}
        <polygon points={fillPoints} fill="url(#retirementGrad)" />
        <polyline points={points} fill="none" stroke="#34d399" strokeWidth={2.5} strokeLinejoin="round" />
        <circle cx={pad.l} cy={pad.t + chartH - (data[0].balance / maxVal) * chartH} r={3} fill="#34d399" />
        <circle
          cx={pad.l + chartW}
          cy={pad.t + chartH - (data[data.length - 1].balance / maxVal) * chartH}
          r={4}
          fill="#34d399"
        />

        {/* Hover crosshair + tooltip */}
        {hd && (
          <g>
            <line x1={hx} y1={pad.t} x2={hx} y2={pad.t + chartH}
              stroke="#5aabab" strokeWidth={1} strokeOpacity={0.4} strokeDasharray="3 3" />
            <circle cx={hx} cy={hy} r={4} fill="#34d399" stroke="#022e2e" strokeWidth={1.5} />
            <rect
              x={tipLeft ? hx - 78 : hx + 6} y={tipY}
              width={72} height={26} rx={3}
              fill="#032e2e" stroke="rgba(13,148,136,0.3)" strokeWidth={1}
            />
            <text x={tipLeft ? hx - 72 : hx + 12} y={tipY + 12}
              fontSize={8} fill="#2e7a7a" fontFamily="DM Mono, monospace">
              Age {hd.age}
            </text>
            <text x={tipLeft ? hx - 72 : hx + 12} y={tipY + 22}
              fontSize={9} fill="#34d399" fontWeight={700} fontFamily="DM Mono, monospace">
              {fmtShort(hd.balance)}
            </text>
          </g>
        )}
      </svg>
      {badgeOverlay && (
        <div style={{ position: 'absolute', top: 8, left: 8, pointerEvents: 'none' }}>
          {badgeOverlay}
        </div>
      )}
    </div>
  )
}
