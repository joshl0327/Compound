import { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'

interface Props {
  newlyUnlocked: string[]
}

export default function MilestoneToast({ newlyUnlocked }: Props) {
  const [visible, setVisible] = useState(false)
  const [label, setLabel] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (newlyUnlocked.length === 0) return
    if (timerRef.current) clearTimeout(timerRef.current)
    setLabel(newlyUnlocked[0])
    setVisible(true)
    timerRef.current = setTimeout(() => setVisible(false), 4000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [newlyUnlocked])

  if (!visible) return null

  return ReactDOM.createPortal(
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 9999,
      background: '#043a3a',
      border: '1px solid rgba(13,148,136,0.5)',
      borderRadius: 4,
      padding: '12px 16px',
      minWidth: 200,
      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    }}>
      <div style={{
        fontSize: 10,
        color: '#2e7a7a',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 4,
      }}>
        Milestone reached
      </div>
      <div style={{
        fontFamily: 'DM Mono, monospace',
        fontSize: 15,
        fontWeight: 700,
        color: '#34d399',
      }}>
        {label}
      </div>
    </div>,
    document.body
  )
}
