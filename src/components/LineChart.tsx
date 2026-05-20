interface DataPoint { age: number; balance: number }

interface LineChartProps {
  data: DataPoint[]
  height?: number
}

export default function LineChart({ data, height: h = 200 }: LineChartProps) {
  const w = 400
  const pad = { t: 10, r: 20, b: 30, l: 55 }
  const chartW = w - pad.l - pad.r
  const chartH = h - pad.t - pad.b

  if (!data || data.length < 2) {
    return <div className="text-muted text-[13px] text-center py-10">Enter your age and target age to see projections</div>
  }

  const maxVal = Math.max(...data.map(d => d.balance)) || 1
  const xStep = chartW / (data.length - 1)
  const points = data.map((d, i) =>
    `${pad.l + i * xStep},${pad.t + chartH - (d.balance / maxVal) * chartH}`
  ).join(' ')

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`}>
      {[0, 1, 2, 3, 4].map(i => {
        const v = Math.round((maxVal / 4) * i)
        const y = pad.t + chartH - (v / maxVal) * chartH
        return (
          <g key={i}>
            <line x1={pad.l} y1={y} x2={pad.l + chartW} y2={y} stroke="#1a2840" strokeWidth={1} strokeDasharray="4 4" />
            <text x={pad.l - 4} y={y + 4} textAnchor="end" fontSize={9} fill="#5a7a9a">${Math.round(v / 1000)}k</text>
          </g>
        )
      })}
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
      <polyline points={points} fill="none" stroke="#a78bfa" strokeWidth={2.5} strokeLinejoin="round" />
      <circle cx={pad.l} cy={pad.t + chartH} r={3} fill="#a78bfa" />
      <circle
        cx={pad.l + chartW}
        cy={pad.t + chartH - (data[data.length - 1].balance / maxVal) * chartH}
        r={4}
        fill="#a78bfa"
      />
    </svg>
  )
}
