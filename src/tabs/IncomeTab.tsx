import Badge from '../components/Badge'
import IncomeSourceCard from '../features/IncomeSourceCard'
import { useData } from '../context/DataContext'
import { useMetrics } from '../hooks/useMetrics'
import { FREQ_OPTIONS, makeDefaultW2Source, makeDefaultOtherSource, STORAGE_KEY } from '../lib/storage'
import type { IncomeSource } from '../types'

export default function IncomeTab() {
  const { data, setData } = useData()
  const { grossMonthly, netMonthly } = useMetrics()

  const sources = data.income?.sources || []
  const primary = sources.find(s => s.id === 'primary') || sources[0]
  const additional = sources.filter(s => s.id !== 'primary')

  function updateSource(updated: IncomeSource) {
    setData(d => ({
      ...d,
      income: {
        sources: d.income.sources.map(s => s.id === updated.id ? updated : s),
      },
    }))
  }

  function deleteSource(id: string) {
    setData(d => ({
      ...d,
      income: { sources: d.income.sources.filter(s => s.id !== id) },
    }))
  }

  function addW2Source() {
    const id = 'src-' + Date.now()
    setData(d => ({
      ...d,
      income: {
        sources: [...d.income.sources, makeDefaultW2Source(id, 'Person ' + (d.income.sources.length + 1))],
      },
    }))
  }

  function addOtherSource() {
    const id = 'src-' + Date.now()
    setData(d => ({
      ...d,
      income: {
        sources: [...d.income.sources, makeDefaultOtherSource(id, 'Side Hustle')],
      },
    }))
  }

  function handleExport() {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'compound-backup.json'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // silently fail
    }
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string)
        setData(() => parsed)
      } catch {
        alert('Invalid backup file.')
      }
    }
    reader.readAsText(file)
    // reset input so same file can be re-imported
    e.target.value = ''
  }

  const isSimpleMode = primary?.mode !== 'detailed'

  return (
    <div>
      {/* Header row */}
      <div className="flex justify-between items-start mb-5 flex-wrap gap-3">
        <div>
          <h1 className="m-0 mb-1 font-display font-extrabold text-2xl text-slate-100">Income</h1>
          <p className="m-0 text-[13px]" style={{ color: '#5a7a9a' }}>
            {isSimpleMode
              ? 'Quick estimate from salary and take-home.'
              : 'Full paycheck breakdown from gross to net.'}
          </p>
        </div>

        {/* Export / Import */}
        <div className="flex gap-2 items-center flex-shrink-0">
          <button
            onClick={handleExport}
            className="px-3 py-1.5 bg-[#0f1923] border border-[#1e3a5f] rounded-lg text-dim text-[11px] font-semibold cursor-pointer hover:text-slate-300 transition-colors"
          >Export</button>
          <label className="px-3 py-1.5 bg-[#0f1923] border border-[#1e3a5f] rounded-lg text-dim text-[11px] font-semibold cursor-pointer hover:text-slate-300 transition-colors">
            Import
            <input type="file" accept=".json" className="hidden" onChange={handleImport} />
          </label>
        </div>
      </div>

      {/* Summary badges */}
      <div className="grid gap-2.5 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        <Badge
          label="Gross Monthly"
          value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(grossMonthly)}
          color="#60a5fa"
          tooltip="Total gross income across all sources before any deductions."
        />
        <Badge
          label="Net Monthly"
          value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(netMonthly)}
          color="#10b981"
          tooltip="Estimated take-home after taxes and deductions."
        />
      </div>

      {/* Primary income source */}
      {primary && (
        <IncomeSourceCard
          source={primary}
          freqOptions={FREQ_OPTIONS}
          onChange={updateSource}
          isPrimary
        />
      )}

      {/* Additional sources */}
      {additional.length > 0 && (
        <div className="mt-5">
          {additional.map(src => (
            <IncomeSourceCard
              key={src.id}
              source={src}
              freqOptions={FREQ_OPTIONS}
              onChange={updateSource}
              onDelete={() => deleteSource(src.id)}
            />
          ))}
        </div>
      )}

      {/* Add income buttons */}
      <div className="flex gap-2.5 mt-5">
        <button
          onClick={addW2Source}
          className="flex-1 py-3 bg-[#0f1923] border border-[#1e3a5f] rounded-[10px] text-blue text-[13px] font-semibold cursor-pointer font-body hover:bg-[#111c28] transition-colors"
        >+ Add W2 Income (Partner / Second Job)</button>
        <button
          onClick={addOtherSource}
          className="flex-1 py-3 bg-[#0f1923] border border-[#1e3a5f] rounded-[10px] text-amber text-[13px] font-semibold cursor-pointer font-body hover:bg-[#111c28] transition-colors"
        >+ Add Additional Income</button>
      </div>
    </div>
  )
}
