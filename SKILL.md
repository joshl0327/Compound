---
name: compound-finance-app
description: >
  This project is "Compound" — a personal finance web app built as a single
  index.html file. Use this skill whenever working on any feature, bug fix,
  refactor, prompt generation, or design decision for this app. Triggers include
  any mention of the app, its tabs (Income, Expenses, Savings, Invest & Retire,
  Overview, Plan, Settings), its features (DTI, debt payoff, savings rate,
  avalanche/snowball, onboarding walkthrough, suggestions section), or any
  request to generate Claude Code prompts for this codebase.
---

# Compound — Personal Finance App

## Project Purpose

Compound is a personal finance web app designed to help people — especially beginners — understand their financial health and take action toward debt payoff, savings goals, and retirement. The primary audience is someone early in their financial journey: they may carry significant consumer debt, have limited savings, and lack financial literacy vocabulary.

The app runs entirely client-side as a **single `index.html` file** with localStorage persistence. There is no backend, no login, no cloud sync.

---

## Core Philosophy

1. **Meet beginners where they are** — Avoid jargon. Every metric should have a plain-English label or tooltip (e.g., "DTI — how much of your paycheck goes to debt. Under 36% is healthy").
2. **Show the user what to do next** — The app doesn't just display data; it guides action via a Suggested Next Steps section on the Overview tab.
3. **Emotional motivation matters** — A debt-free date and savings milestone are more motivating than raw numbers. Surface these prominently.
4. **Progressive complexity** — Beginners should reach a meaningful "aha moment" (their debt-free date, their savings rate) in under 5 minutes, without filling in every tab.

---

## Architecture

- **Single file**: All HTML, CSS, and JavaScript lives in `index.html` at the **repo root**
- **Persistence**: `localStorage` for all user data — **localStorage key names must never be changed**
- **No frameworks**: Vanilla JS (no React, no build step)
- **Dark theme**: Consistent dark card styling throughout
- **Data model**: Settings, income, essentials, debts, discretionary, savings, investments stored as structured JSON in localStorage
- **Default debt strategy**: Avalanche (highest interest rate first)

---

## Tab Structure (current)

| Tab | Purpose |
|-----|---------|
| **Overview** | Dashboard: DTI badges, savings rate, housing %, Suggested Next Steps |
| **Income** | Annual salary, take-home pay, income basis (gross/net), employer match |
| **Expenses** | Essentials + Debt Obligations + Discretionary. Baseline vs Plan columns |
| **Savings** | Emergency fund goal, monthly contribution, general savings buckets |
| **Invest & Retire** | 401k, Roth IRA, HSA (Retirement) + Brokerage/taxable (Invest) |
| **Plan** | What-if sandbox: adjust spending, set savings targets, model extra debt payments |
| **Settings** | Debt strategy (Avalanche / Snowball / Custom), income basis, display prefs |

---

## Key Metrics & Calculations

- **Total DTI**: (all debt minimum payments + housing) ÷ gross monthly income
- **Consumer DTI**: (non-housing debt minimum payments) ÷ gross monthly income
- **Housing %**: Housing cost ÷ gross monthly income (target: ≤28%)
- **Savings Rate**: Monthly savings + investments ÷ gross monthly income (targets: 10% floor, 15% comfortable, 20%+ early retirement)
- **Debt payoff date**: Calculated using avalanche or snowball strategy based on settings
- **Emergency fund runway**: Months of expenses covered by current savings

### DTI label convention
- Label is **"Total DTI"** (never "Total DTI incl. mortgage") — housing is always included
- **"Consumer DTI"** = debt excluding housing (this is the one that excludes mortgage)

---

## Onboarding Walkthrough

A 6-step guided tour tied to tab navigation:

1. **Income** — "Start with what you earn"
2. **Expenses** — "Document every outflow"
3. **Savings** — "Emergency fund before everything else"
4. **Invest & Retire** — "Retirement accounts and investing"
5. **Overview** — "Your complete financial picture"
6. **Plan** — "Play with what-ifs"

Steps use colored headers and plain-English body text. Buttons: "Got it / Next", "Skip tour".

---

## Suggested Next Steps (Overview tab)

A dynamic section at the bottom of Overview that reads the user's actual data and surfaces 3–5 prioritized action items. Each item has:
- An icon (⚠️ warning, 🎯 goal, ✅ on track)
- A plain-English suggestion referencing the user's specific debt names / amounts
- A "time saved" or "payoff by" impact statement where applicable

**Priority logic** (roughly follows the financial order of operations):
1. Flag housing cost > 28% gross
2. Flag consumer DTI > 20%
3. Direct extra cash toward highest-rate debt (name the specific debt)
4. Emergency fund status and projected completion date
5. Savings rate vs. benchmark (10% / 15% / 20%)
6. Retirement contribution vs. employer match capture

---

## Design Conventions

- **Dark card styling**: `background: #1e293b` or similar dark slate
- **Badge components**: Used for summary metrics at the top of tabs (e.g., Total Debt, Monthly Min Payments, DTI)
- **Section titles**: Dividers within tabs to separate logical groups
- **Empty states**: When a value is 0 or unset, show instructional placeholder text — never just "$0"
- **Radio button groups**: Used for multi-option settings (income basis, debt strategy) — match existing `incomeBasis` styling
- **Progress bar**: Shows onboarding completion across tabs (not a step indicator for the walkthrough tour itself)

---

## Claude Code Prompt Guidelines

When generating Claude Code prompts for this codebase:

1. **One concern per prompt** — Don't bundle unrelated changes. Separate structural refactors from logic changes.
2. **Reference exact variable/function names** when known (e.g., `updateSettings()`, `ONBOARD_STEPS`, `isMortgage`, `incomeBasis`)
3. **Specify localStorage key preservation** explicitly whenever moving UI sections — data structure must not change, only UI placement
4. **Order prompts to avoid conflicts** — structural changes (tab merges) before content changes (empty states, labels)
5. **Flag the most complex prompts** — note which ones are risky and suggest splitting if needed
6. **Include "no other changes" guardrails** — Claude Code tends to over-refactor; be explicit about scope

### Prompt template structure
```
In index.html, [action]. 

Specifics:
- [detail 1]
- [detail 2]
- ...

No other changes.
```

---

## Claude Code Guardrails

The entire app is one file. Claude Code will be tempted to over-scope. Enforce these rules on every prompt:

- **Never rename localStorage keys** — changing a key name silently wipes user data on next load
- **Never touch unrelated tabs** — if a prompt is about Expenses, don't modify Income or Overview
- **Never add a build step or external dependencies** — the app is intentionally zero-dependency
- **Never split index.html into multiple files** — single-file is an explicit constraint
- **Preserve all existing data wiring** when moving UI between tabs — only change placement, not structure
- **Don't add frameworks** (React, Vue, Alpine, etc.) — vanilla JS only
- **Scope creep check**: if a prompt says "no other changes", Claude Code must not refactor adjacent code even if it looks messy

---


## Known Issues / Decisions Log

- Crypto/speculative assets belong under Invest (not Savings) — treated as speculative alongside taxable brokerage
- localStorage is one browser-clear away from data loss — export/import is the current mitigation; account system is a future consideration

---

## Future Roadmap (not yet built)

- Mobile layout optimization (budget tab especially)
- Age-based retirement benchmarks (1× salary by 30, 3× by 40, etc.)
- "Quick Start" onboarding mode — 4–5 questions to populate Overview immediately
- Cloud sync / account system
- Inflation-adjusted retirement projections
- Speculative vs. index fund split in Invest tab
