import type { AppData, IncomeSource, FrequencyOption } from '../types'

export const STORAGE_KEY = 'compound_v4'
export const ONBOARDING_KEY = 'compound_onboarding_done'
export const PROFILE_DONE_KEY = 'compound_profile_done'

export interface EssentialDefault {
  id: string
  name: string
  amount: number
}

export const ESSENTIAL_DEFAULTS: EssentialDefault[] = [
  { id: 'housing', name: 'Housing', amount: 0 },
  { id: 'groceries', name: 'Groceries', amount: 0 },
  { id: 'utilities', name: 'Utilities', amount: 0 },
  { id: 'transportation', name: 'Transportation', amount: 0 },
  { id: 'car_insurance', name: 'Car Insurance', amount: 0 },
  { id: 'phone', name: 'Phone', amount: 0 },
  { id: 'subscriptions', name: 'Subscriptions', amount: 0 },
]

export const DISC_SUGGESTIONS = [
  { group: 'Dining and Social', items: ['Dining Out', 'Coffee Shops', 'Bars and Nightlife'] },
  { group: 'Personal', items: ['Personal Care', 'Clothing and Shopping', 'Gym and Fitness'] },
  { group: 'Life Admin', items: ['Car Maintenance', 'Medical and Dental', 'Pet Expenses'] },
  { group: 'Entertainment', items: ['Streaming Services', 'Hobbies', 'Travel'] },
]

export const FREQ_OPTIONS: FrequencyOption[] = [
  { id: 'weekly', label: 'Weekly', short: 'week', perYear: 52 },
  { id: 'biweekly', label: 'Biweekly', short: 'biweek', perYear: 26 },
  { id: 'semimonthly', label: 'Semi-monthly', short: 'semi-month', perYear: 24 },
  { id: 'monthly', label: 'Monthly', short: 'month', perYear: 12 },
]

export function makeDefaultW2Source(id: string, name: string): IncomeSource {
  return {
    id,
    name,
    type: 'w2',
    mode: 'simple',
    annualSalary: '',
    takeHomePerPaycheck: '',
    frequency: 'biweekly',
    grossPerPaycheck: '',
    healthInsurance: '',
    fsa: '',
    otherPreTax: '',
    federalTax: '',
    stateTax: '',
    otherPostTax: '',
    taxesPerPaycheck: '',
    hsaPerPaycheck: '',
    trad401kPaycheck: '',
    roth401kPaycheck: '',
    customPreTax: [],
    retirement: {
      use401kPercent: true,
      traditional401kPct: '',
      roth401kPct: '',
      employerMatchPct: '',
      traditional401kDollar: '',
      roth401kDollar: '',
      traditional401kBalance: '',
      roth401kBalance: '',
      rothIra: { monthly: '', currentBalance: '' },
      currentAge: '',
      targetAge: '65',
    },
  }
}

export function makeDefaultOtherSource(id: string, name: string): IncomeSource {
  return { id, name, type: 'other', monthlyNet: '' }
}

export function makeDefault(): AppData {
  return {
    income: { sources: [makeDefaultW2Source('primary', 'Person 1')] },
    debts: [],
    budget: {
      essentials: ESSENTIAL_DEFAULTS.map(e => ({
        id: e.id,
        name: e.name,
        baseline: String(e.amount),
        plan: '',
      })),
      discretionary: [],
    },
    retirement: { hsa: { monthly: '', currentBalance: '', familyCoverage: false } },
    savings: {
      emergencyFund: { current: '', goal: '', monthly: '' },
      generalSavings: { monthly: '', goal: '' },
    },
    invest: { monthly: '', currentBalance: '', notes: '' },
    settings: { incomeBasis: 'gross', debtStrategy: 'avalanche' },
    plan: {
      essentials: {},
      discretionary: {},
      debtPayments: {},
      savings: { emergencyFund: '', generalSavings: '' },
      goals: [],
    },
  }
}

function normalizeDateStr(raw: string | undefined): string {
  if (!raw) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const d = new Date(raw)
  if (isNaN(d.getTime())) return ''
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

function normalizeDebtDates(debts: AppData['debts']): AppData['debts'] {
  return debts.map(d => ({
    ...d,
    promoEndDate: normalizeDateStr(d.promoEndDate),
    loanStartDate: normalizeDateStr(d.loanStartDate),
    loanEndDate: normalizeDateStr(d.loanEndDate),
  }))
}

export function migrateData(parsed: Partial<AppData> & Record<string, unknown>, def: AppData): AppData {
  // Old format: data.income is a flat object (no .sources array)
  if (!parsed.income || !(parsed.income as { sources?: unknown }).sources) {
    const old = (parsed.income || {}) as Record<string, string>
    const oldRet = (parsed.retirement || {}) as Record<string, unknown>

    const primary = makeDefaultW2Source('primary', 'Person 1')
    primary.mode = (old.mode as 'simple' | 'detailed') || 'simple'
    primary.annualSalary = old.annualSalary || ''
    primary.takeHomePerPaycheck = old.takeHomePerPaycheck || ''
    primary.frequency = (old.frequency as 'biweekly') || 'biweekly'
    primary.grossPerPaycheck = old.grossPerPaycheck || ''
    primary.healthInsurance = old.healthInsurance || ''
    primary.fsa = old.fsa || ''
    primary.otherPreTax = old.otherPreTax || ''
    primary.federalTax = old.federalTax || ''
    primary.stateTax = old.stateTax || ''
    primary.otherPostTax = old.otherPostTax || ''
    primary.retirement = {
      use401kPercent: oldRet.use401kPercent !== undefined ? Boolean(oldRet.use401kPercent) : true,
      traditional401kPct: String(oldRet.traditional401kPct || ''),
      roth401kPct: String(oldRet.roth401kPct || ''),
      employerMatchPct: String(oldRet.employerMatchPct || ''),
      traditional401kDollar: String(oldRet.traditional401kDollar || ''),
      roth401kDollar: String(oldRet.roth401kDollar || ''),
      traditional401kBalance: String(oldRet.traditional401kBalance || ''),
      roth401kBalance: String(oldRet.roth401kBalance || ''),
      rothIra: (oldRet.rothIra as { monthly: string; currentBalance: string }) || {
        monthly: '',
        currentBalance: '',
      },
      currentAge: String(oldRet.currentAge || ''),
      targetAge: String(oldRet.targetAge || '65'),
    }

    return {
      income: { sources: [primary] },
      debts: normalizeDebtDates((parsed.debts as AppData['debts']) || []),
      budget: (parsed.budget as AppData['budget']) || def.budget,
      retirement: { hsa: (oldRet.hsa as AppData['retirement']['hsa']) || def.retirement.hsa },
      savings: { ...def.savings, ...((parsed.savings as Partial<AppData['savings']>) || {}) },
      invest: { ...def.invest, ...((parsed.invest as Partial<AppData['invest']>) || {}) },
      settings: { ...def.settings, ...((parsed.settings as Partial<AppData['settings']>) || {}) },
      plan: (parsed.plan as AppData['plan']) || def.plan,
    }
  }

  const result = parsed as AppData
  return { ...result, debts: normalizeDebtDates(result.debts || []) }
}

export function loadFromStorage(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return migrateData(parsed, makeDefault())
    }
  } catch {
    // Silently fail and return default
  }
  return makeDefault()
}

export function saveToStorage(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Silently fail
  }
}
