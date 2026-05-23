import { useState } from 'react'
import type { ReactNode } from 'react'

interface SectionTitleProps {
  children: ReactNode
  accent?: string
  bar?: boolean
  hint?: ReactNode
}

export default function SectionTitle({ children, accent = '#3b82f6', bar = true, hint }: SectionTitleProps) {
  const [tip, setTip] = useState(false)
  return (
    <div className="flex items-center gap-2.5 mb-4">
      {bar && <div className="w-1 h-5 rounded-sm flex-shrink-0" style={{ background: accent }} />}
      <h2 className="m-0 text-[11px] font-semibold font-body uppercase tracking-[0.1em]" style={{ color: 'var(--color-text-muted)' }}>{children}</h2>
      {hint && (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <button
            onMouseEnter={() => setTip(true)}
            onMouseLeave={() => setTip(false)}
            style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '50%', width: 14, height: 14, fontSize: 8, color: tip ? 'var(--color-text-muted)' : 'var(--color-text-dim)', cursor: 'default', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >i</button>
          {tip && (
            <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 100, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 5, padding: '8px 10px', marginTop: 6, fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.6, width: 230, pointerEvents: 'none' }}>
              {hint}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
