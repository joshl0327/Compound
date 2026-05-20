import type { ReactNode, CSSProperties } from 'react'

interface CardProps {
  children: ReactNode
  style?: CSSProperties
  className?: string
}

export default function Card({ children, style, className = '' }: CardProps) {
  return (
    <div className={`card ${className}`} style={style}>
      {children}
    </div>
  )
}
