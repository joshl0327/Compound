import type { ReactNode } from 'react'

interface SectionTitleProps {
  children: ReactNode
  accent?: string
  bar?: boolean
}

export default function SectionTitle({ children, accent = '#3b82f6', bar = true }: SectionTitleProps) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      {bar && <div className="w-1 h-5 rounded-sm flex-shrink-0" style={{ background: accent }} />}
      <h2 className="m-0 text-[15px] font-bold text-slate-100 font-display">{children}</h2>
    </div>
  )
}
