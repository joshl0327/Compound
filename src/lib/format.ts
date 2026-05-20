export function fmt(v: number | string): string {
  const n = parseFloat(v as string) || 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

export function fmtDec(v: number | string): string {
  const n = parseFloat(v as string) || 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

export function fmtShort(v: number | string): string {
  const n = parseFloat(v as string) || 0
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return '$' + (n / 1_000).toFixed(0) + 'k'
  return fmt(n)
}

export function fmtCurrencyInput(raw: string | null | undefined): string {
  if (raw === '' || raw === null || raw === undefined) return ''
  const cleaned = String(raw).replace(/[^0-9.]/g, '')
  const parts = cleaned.split('.')
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  if (parts.length > 1) return intPart + '.' + parts[1]
  return intPart
}

export function stripCommas(v: string | null | undefined): string {
  if (v === '' || v === null || v === undefined) return ''
  return String(v).replace(/,/g, '')
}
