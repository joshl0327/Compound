interface DonutSegment {
  label: string
  value: number
  color: string
}

interface DonutChartProps {
  segments: DonutSegment[]
  centerLabel: string
  centerValue: string
  size?: number
}

export default function DonutChart({ segments, centerLabel, centerValue, size = 200 }: DonutChartProps) {
  const cx = size / 2
  const cy = size / 2
  const outerR = size * 0.42
  const innerR = size * 0.25

  const activeSegments = segments.filter(s => s.value > 0)
  const total = activeSegments.reduce((s, seg) => s + seg.value, 0)

  if (total <= 0) {
    return (
      <div>
        <svg width="100%" viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="#1e2d3d" strokeWidth={outerR - innerR} />
          <text x={cx} y={cy - 8} textAnchor="middle" fontSize={9} fill="#3a5a7a" fontFamily="DM Sans, sans-serif">No data yet</text>
          <text x={cx} y={cy + 8} textAnchor="middle" fontSize={9} fill="#3a5a7a" fontFamily="DM Sans, sans-serif">Add income to get started</text>
        </svg>
      </div>
    )
  }

  let cumulative = 0
  const startAngle = -Math.PI / 2

  const arcs = activeSegments.map(seg => {
    const segStart = startAngle + (cumulative / total) * 2 * Math.PI
    cumulative += seg.value
    const segEnd = startAngle + (cumulative / total) * 2 * Math.PI

    const x1o = cx + outerR * Math.cos(segStart)
    const y1o = cy + outerR * Math.sin(segStart)
    const x2o = cx + outerR * Math.cos(segEnd)
    const y2o = cy + outerR * Math.sin(segEnd)
    const x1i = cx + innerR * Math.cos(segEnd)
    const y1i = cy + innerR * Math.sin(segEnd)
    const x2i = cx + innerR * Math.cos(segStart)
    const y2i = cy + innerR * Math.sin(segStart)
    const largeArc = (segEnd - segStart) > Math.PI ? 1 : 0
    const d = `M ${x1o} ${y1o} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2o} ${y2o} L ${x1i} ${y1i} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x2i} ${y2i} Z`

    return { d, color: seg.color, label: seg.label }
  })

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${size} ${size}`}>
        {arcs.map(arc => (
          <path key={arc.label} d={arc.d} fill={arc.color} />
        ))}
        <text
          x={cx}
          y={cy + 6}
          textAnchor="middle"
          fontSize={18}
          fontFamily="DM Mono, sans-serif"
          fill="#e8f0f8"
          fontWeight={700}
        >
          {centerValue}
        </text>
        <text
          x={cx}
          y={cy + 18}
          textAnchor="middle"
          fontSize={9}
          fontFamily="DM Sans, sans-serif"
          fill="#5a7a9a"
        >
          {centerLabel}
        </text>
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 justify-center">
        {segments.filter(s => s.value > 0).map(seg => (
          <div key={seg.label} className="flex items-center gap-1.5 text-[11px]">
            <div className="rounded-full flex-shrink-0" style={{ width: 8, height: 8, background: seg.color }} />
            <span style={{ color: '#8b9cb5' }}>{seg.label}</span>
            <span className="font-mono" style={{ color: '#e8f0f8' }}>
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(seg.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
