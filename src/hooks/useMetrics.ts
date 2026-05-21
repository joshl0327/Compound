import { useData } from '../context/DataContext'
import { calcSourceMetrics, calcPayoff, debtColor, payoffDate } from '../lib/calculations'
import { FREQ_OPTIONS } from '../lib/storage'
import type { SourceCalc } from '../types'

export function useMetrics() {
  const { data } = useData()
  const sources = data.income?.sources || []
  const sourceCalcs: SourceCalc[] = sources.map(src => calcSourceMetrics(src, FREQ_OPTIONS))

  const grossMonthly = sourceCalcs.reduce((s, c) => s + c.gross, 0)
  const netMonthly = sourceCalcs.reduce((s, c) => s + c.net, 0)
  const trad401kMonthly = sourceCalcs.reduce((s, c) => s + c.trad401k, 0)
  const roth401kMonthly = sourceCalcs.reduce((s, c) => s + c.roth401k, 0)
  const employerMatch = sourceCalcs.reduce((s, c) => s + c.match, 0)
  const rothIraMonthly = sourceCalcs.reduce((s, c) => s + c.rothIra, 0)

  let hsaMonthly = parseFloat(data.retirement?.hsa?.monthly || '') || 0
  const hsaFromDetailed = sourceCalcs.reduce((s, c) => {
    if (!c.isSimple && parseFloat(c.src.hsaPerPaycheck || '') > 0)
      return s + (parseFloat(c.src.hsaPerPaycheck || '') || 0) * c.perYear / 12
    return s
  }, 0)
  if (hsaFromDetailed > 0) hsaMonthly = hsaFromDetailed

  const essTotalR = data.budget.essentials.reduce((s, e) => s + (parseFloat(e.baseline) || 0), 0)
  const debtMinTotal = data.debts.reduce((s, d) => s + (!d.isMortgage ? parseFloat(d.minPayment) || 0 : 0), 0)
  const discRealTotal = data.budget.discretionary.reduce((s, d) => s + (parseFloat(d.baseline) || 0), 0)
  const essTotalP = data.budget.essentials.reduce((s, e) => s + (parseFloat(e.plan !== undefined && e.plan !== '' ? e.plan : e.baseline) || 0), 0)
  const debtPlanTotal = data.debts.reduce((s, d) => s + (!d.isMortgage ? parseFloat(d.planPayment || d.minPayment) || 0 : 0), 0)
  const discPlanTotal = data.budget.discretionary.reduce((s, d) => s + (parseFloat(d.plan !== undefined && d.plan !== '' ? d.plan : d.baseline) || 0), 0)
  const realityTotal = essTotalR + debtMinTotal + discRealTotal
  const planTotal = essTotalP + debtPlanTotal + discPlanTotal
  const planSurplus = netMonthly - planTotal

  const housingItem = data.budget.essentials.find(e => e.id === 'housing')
  const housingAmt = parseFloat(housingItem ? (housingItem.plan || housingItem.baseline) : '0') || 0
  const housingPct = grossMonthly > 0 ? (housingAmt / grossMonthly * 100).toFixed(1) : '0'

  const consumerDtiTotal = data.debts.reduce((s, d) => s + (!d.isMortgage ? parseFloat(d.minPayment) || 0 : 0), 0)
  const consumerDti = grossMonthly > 0 ? (consumerDtiTotal / grossMonthly * 100).toFixed(1) : '0'
  const dtiTotal = housingAmt + consumerDtiTotal
  const dti = grossMonthly > 0 ? (dtiTotal / grossMonthly * 100).toFixed(1) : '0'

  const efMonthly = parseFloat(data.savings.emergencyFund.monthly) || 0
  const genMonthly = parseFloat(data.savings.generalSavings.monthly) || 0
  const liquidSavingsMonthly = efMonthly + genMonthly
  const investMonthly = parseFloat(data.invest.monthly) || 0
  const totalRetirementMonthly = trad401kMonthly + roth401kMonthly + rothIraMonthly + hsaMonthly + employerMatch
  const totalSavedMonthly = liquidSavingsMonthly + totalRetirementMonthly + investMonthly
  const postTaxSavingsMonthly = liquidSavingsMonthly + rothIraMonthly + investMonthly

  const savingsRate = grossMonthly > 0 ? (totalSavedMonthly / grossMonthly * 100).toFixed(1) : '0'
  const retireRate = grossMonthly > 0 ? (totalRetirementMonthly / grossMonthly * 100).toFixed(1) : '0'

  // Plan tab sandbox calculations
  const planTabEssTotal = data.budget.essentials.reduce((s, e) => {
    const v = data.plan?.essentials?.[e.id] !== undefined ? data.plan.essentials[e.id] : e.baseline
    return s + (parseFloat(v) || 0)
  }, 0)
  const planTabDebtTotal = data.debts.reduce((s, d) => {
    if (d.isMortgage) return s
    return s + (parseFloat(d.planPayment || d.minPayment || '0') || 0)
  }, 0)
  const planTabDiscTotal = data.budget.discretionary.reduce((s, e) => {
    const v = data.plan?.discretionary?.[e.id] !== undefined ? data.plan.discretionary[e.id] : e.baseline
    return s + (parseFloat(v) || 0)
  }, 0)
  const planTabTotal = planTabEssTotal + planTabDebtTotal + planTabDiscTotal
  const planTabTotalWithSavings = planTabTotal + postTaxSavingsMonthly
  const planTabSurplus = netMonthly - planTabTotalWithSavings
  const planTabBaselineTotal = realityTotal + postTaxSavingsMonthly

  return {
    sourceCalcs, grossMonthly, netMonthly,
    trad401kMonthly, roth401kMonthly, employerMatch, rothIraMonthly, hsaMonthly,
    essTotalR, debtMinTotal, discRealTotal, realityTotal, planTotal, planSurplus,
    essTotalP, debtPlanTotal, discPlanTotal,
    housingAmt, housingPct, consumerDti, dti, consumerDtiTotal,
    liquidSavingsMonthly, investMonthly, totalRetirementMonthly, totalSavedMonthly,
    postTaxSavingsMonthly, savingsRate, retireRate,
    planTabTotal, planTabTotalWithSavings, planTabSurplus, planTabBaselineTotal,
    calcPayoff, debtColor, payoffDate,
  }
}
