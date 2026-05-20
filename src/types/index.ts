export type TabId = 'overview' | 'income' | 'expenses' | 'savings' | 'invest' | 'plan' | 'settings'
export type DebtStrategy = 'avalanche' | 'snowball' | 'custom'
export type IncomeBasis = 'gross' | 'net'
export type IncomeMode = 'simple' | 'detailed'
export type IncomeType = 'w2' | 'other'
export type FrequencyId = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly'

export interface FrequencyOption {
  id: FrequencyId
  label: string
  short: string
  perYear: number
}

export interface CustomDeduction {
  id: string
  label: string
  amount: string
}

export interface SourceRetirement {
  use401kPercent: boolean
  traditional401kPct: string
  roth401kPct: string
  employerMatchPct: string
  traditional401kDollar: string
  roth401kDollar: string
  traditional401kBalance: string
  roth401kBalance: string
  rothIra: { monthly: string; currentBalance: string }
  currentAge: string
  targetAge: string
}

export interface IncomeSource {
  id: string
  name: string
  type: IncomeType
  // W2 fields
  mode?: IncomeMode
  annualSalary?: string
  takeHomePerPaycheck?: string
  frequency?: FrequencyId
  grossPerPaycheck?: string
  taxesPerPaycheck?: string
  hsaPerPaycheck?: string
  trad401kPaycheck?: string
  roth401kPaycheck?: string
  customPreTax?: CustomDeduction[]
  retirement?: SourceRetirement
  // Legacy detailed fields (fallback in net calculation)
  healthInsurance?: string
  fsa?: string
  otherPreTax?: string
  federalTax?: string
  stateTax?: string
  otherPostTax?: string
  // Other income type
  monthlyNet?: string
}

export interface Debt {
  id: string
  name: string
  balance: string
  rate: string
  minPayment: string
  planPayment?: string
  isMortgage: boolean
  isPromo?: boolean
  promoRate?: string
  promoEndDate?: string
  postPromoRate?: string
  monthlyEscrow?: string
  escrowBalance?: string
  loanStartDate?: string
  loanEndDate?: string
}

export interface BudgetItem {
  id: string
  name: string
  baseline: string
  plan?: string
}

export interface HsaData {
  monthly: string
  currentBalance: string
  familyCoverage: boolean
}

export interface SavingsGoal {
  current: string
  goal: string
  monthly: string
}

export interface GeneralSavings {
  monthly: string
  goal: string
}

export interface PlanGoal {
  id: string
  name: string
  target: string
  monthly: string
}

export interface PlanData {
  essentials: Record<string, string>
  discretionary: Record<string, string>
  debtPayments: Record<string, string>
  savings: { emergencyFund: string; generalSavings: string }
  goals: PlanGoal[]
}

export interface AppData {
  income: { sources: IncomeSource[] }
  debts: Debt[]
  budget: { essentials: BudgetItem[]; discretionary: BudgetItem[] }
  retirement: { hsa: HsaData }
  savings: { emergencyFund: SavingsGoal; generalSavings: GeneralSavings }
  invest: { monthly: string; currentBalance: string; notes: string }
  settings: { incomeBasis: IncomeBasis; debtStrategy: DebtStrategy }
  plan: PlanData
}

// Derived calc result per income source
export interface SourceCalc {
  src: IncomeSource
  gross: number
  net: number
  trad401k: number
  roth401k: number
  match: number
  rothIra: number
  perYear: number
  isSimple: boolean
}

export interface PayoffResult {
  months: number
  totalInterest: number
}
