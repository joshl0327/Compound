import { useState } from 'react'

interface BadgeProps {
  label: string
  value: string
  color?: string
  sub?: string
  tooltip?: string
  large?: boolean
  tint?: boolean
}

export default function Badge({ label, value, color = '#3b82f6', sub, tooltip, large, tint }: BadgeProps) {
  const [tipOpen, setTipOpen] = useState(false)
  return (
    <div
      className="relative rounded-[10px] p-3.5"
      style={{
        border: `1px solid ${color}22`,
        background: tint ? `linear-gradient(135deg, ${color}0e, ${color}06)` : '#0a1520',
      }}
    >
      <div className="text-[10px] text-dim tracking-widest uppercase mb-1 flex items-center gap-1">
        {label}
        {tooltip && (
          <button
            onMouseEnter={() => setTipOpen(true)}
            onMouseLeave={() => setTipOpen(false)}
            className="rounded-full flex items-center justify-center font-body"
            style={{
              background: 'none', border: '1px solid #2a4060', width: 14, height: 14,
              fontSize: 9, color: tipOpen ? '#60a5fa' : '#4a7fa5', cursor: 'default', padding: 0,
            }}
          >?</button>
        )}
      </div>
      <div className={`${large ? 'text-2xl' : 'text-xl'} font-bold font-mono`} style={{ color }}>{value}</div>
      {sub && <div className="text-[11px] text-subtle mt-0.5">{sub}</div>}
      {tipOpen && tooltip && (
        <div className="absolute top-full left-0 z-[100] bg-[#0d1e30] border border-[#1e3a5f] rounded-lg p-3 mt-1 text-xs text-dim leading-relaxed w-[220px] pointer-events-none">
          {tooltip}
        </div>
      )}
    </div>
  )
}
