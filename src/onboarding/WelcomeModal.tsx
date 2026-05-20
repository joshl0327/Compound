import { ONBOARDING_KEY, STORAGE_KEY } from '../lib/storage'

interface WelcomeModalProps {
  onQuickStart: () => void
  onSkip: () => void
}

export default function WelcomeModal({ onQuickStart, onSkip }: WelcomeModalProps) {
  function handleImport() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target?.result as string)
          // Store it directly — DataContext will load it on next mount
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
          localStorage.setItem(ONBOARDING_KEY, '1')
          window.location.reload()
        } catch {
          alert('Invalid backup file')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-5">
      <div
        className="max-w-sm w-full rounded-2xl p-8"
        style={{
          background: 'linear-gradient(145deg, #111c28, #0d1620)',
          border: '1px solid #1a2840',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-7">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-[22px] font-black text-white"
            style={{
              background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)',
              fontFamily: "'Syne', sans-serif",
            }}
          >
            C
          </div>
          <div>
            <div
              className="text-[22px] font-black tracking-tight text-slate-100"
              style={{ fontFamily: "'Syne', sans-serif", letterSpacing: '-0.02em' }}
            >
              Compound
            </div>
            <div className="text-xs text-[#4a7fa5]">Your financial literacy journey</div>
          </div>
        </div>

        {/* Headline */}
        <h2
          className="text-[20px] font-black text-slate-100 mb-3"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          Welcome. Is this your first time?
        </h2>

        {/* Description */}
        <p className="text-[13px] text-[#8b9cb5] leading-relaxed mb-6">
          Compound helps you understand your complete financial picture — income, debt, budget,
          savings, and retirement — in one place. No accounts, no subscriptions, no ads.
        </p>

        {/* Privacy note */}
        <div
          className="flex gap-3 items-start rounded-xl p-3 mb-6"
          style={{ background: '#0a1520', border: '1px solid #1e3a5f' }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            style={{ flexShrink: 0, marginTop: 1 }}
          >
            <path
              d="M10 1.5L3 4.5V9.5C3 13.5 6 17 10 18.5C14 17 17 13.5 17 9.5V4.5L10 1.5Z"
              stroke="#60a5fa"
              strokeWidth="1.5"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          <div>
            <div className="text-[13px] font-bold text-[#60a5fa] mb-1">
              Your data never leaves your device
            </div>
            <div className="text-[12px] text-[#5a7a9a] leading-relaxed">
              Everything is stored locally in your browser. Nothing is sent to any server. Use the
              Export button to back up your data or move it to another device.
            </div>
          </div>
        </div>

        {/* Quick Start CTA */}
        <button
          onClick={onQuickStart}
          className="w-full py-3.5 px-5 mb-3 rounded-xl text-white text-sm font-bold cursor-pointer border-none"
          style={{
            background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Quick Start — 3 questions, then your overview
        </button>

        {/* Import backup */}
        <button
          onClick={handleImport}
          className="w-full py-3 px-5 mb-3 rounded-xl text-[#60a5fa] text-[13px] font-semibold cursor-pointer text-center"
          style={{
            background: '#0f1923',
            border: '1px solid #1e3a5f',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Import a backup
        </button>

        {/* Skip */}
        <button
          onClick={onSkip}
          className="w-full py-3 px-5 rounded-xl text-[#5a7a9a] text-[13px] font-semibold cursor-pointer"
          style={{
            background: 'none',
            border: '1px solid #1a2840',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Skip — I'll explore on my own
        </button>
      </div>
    </div>
  )
}
