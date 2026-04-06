import { useState, useMemo, useEffect, useRef } from 'react'
import axios from 'axios'
import { Transaction, Budget } from '../App'
import { format, parse } from 'date-fns'

type Props = {
  transactions: Transaction[]
  budgets: Budget[]
  onBudgetChange: () => void
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 10 }, (_, i) => (currentYear - 2 + i).toString())

export default function BudgetTracker({ transactions, budgets, onBudgetChange }: Props) {
  const [selMonth, setSelMonth] = useState(MONTHS[new Date().getMonth()])
  const [selYear, setSelYear] = useState(currentYear.toString())
  const selectedMonthStr = `${selMonth} ${selYear}`

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bulkBudgets, setBulkBudgets] = useState<Record<string, string>>({})
  const [editorOpen, setEditorOpen] = useState(false)

  // Track last selected month to avoid resetting on remote refresh
  const lastMonthStr = useRef(selectedMonthStr)

  const availableCategories = useMemo(() => {
    const cats = new Set<string>(['Groceries', 'Food & Drink', 'Gas', 'Shopping', 'Bills & Utilities', 'Entertainment', 'Personal', 'Travel'])
    transactions.forEach(t => { if (t.category) cats.add(t.category) })
    return Array.from(cats).sort()
  }, [transactions])

  // Only pre-fill if the month actually changed (user navigated) — not on remote budget refresh
  useEffect(() => {
    if (selectedMonthStr !== lastMonthStr.current) {
      lastMonthStr.current = selectedMonthStr
    }
    const currentMonthBudgets = budgets.filter(b => b.month === selectedMonthStr)
    const initialBulk: Record<string, string> = {}
    currentMonthBudgets.forEach(b => { initialBulk[b.category] = b.amount.toString() })
    setBulkBudgets(initialBulk)
  }, [selectedMonthStr]) // intentionally only on month change, not budgets

  const handleBulkChange = (cat: string, val: string) => {
    setBulkBudgets(prev => ({ ...prev, [cat]: val }))
  }

  const handleSaveBulk = async () => {
    setIsSubmitting(true)
    const payload = []
    for (const [cat, val] of Object.entries(bulkBudgets)) {
      const amount = parseFloat(val)
      if (!isNaN(amount) && amount > 0) {
        payload.push({ month: selectedMonthStr, category: cat, amount })
      }
    }
    try {
      if (payload.length > 0) {
        await axios.post('/budgets/bulk', payload)
        onBudgetChange()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`/budgets/${id}`)
      onBudgetChange()
    } catch (err) {
      console.error(err)
    }
  }

  const monthData = useMemo(() => {
    const activeBudgets = budgets.filter(b => b.month === selectedMonthStr)
    const actualSpends: Record<string, number> = {}
    transactions.forEach(t => {
      if (t.amount >= 0) return
      try {
        const dStr = t.transaction_date || t.post_date
        const date = parse(dStr, 'MM/dd/yyyy', new Date())
        const mStr = format(date, 'MMM yyyy')
        if (mStr === selectedMonthStr && t.category) {
          actualSpends[t.category] = (actualSpends[t.category] || 0) + Math.abs(t.amount)
        }
      } catch {}
    })
    return activeBudgets.map(b => {
      const spent = actualSpends[b.category] || 0
      const percent = b.amount > 0 ? Math.min((spent / b.amount) * 100, 100) : 100
      const overBudget = spent > b.amount
      return { ...b, spent, percent, overBudget }
    })
  }, [budgets, selectedMonthStr, transactions])

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)

  return (
    <div style={{ paddingBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Header bar — month/year + toggle editor */}
      <div className="card" style={{ padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Viewing budgets for</span>
          <select value={selMonth} onChange={e => setSelMonth(e.target.value)} className="filter-input" style={{ flex: 0, minWidth: '100px' }}>
            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={selYear} onChange={e => setSelYear(e.target.value)} className="filter-input" style={{ flex: 0, minWidth: '90px' }}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem' }}>
            <button
              className={`btn btn-sm ${editorOpen ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setEditorOpen(o => !o)}
            >
              {editorOpen ? 'Close Editor' : 'Edit Budgets'}
            </button>
            {editorOpen && (
              <button className="btn btn-sm btn-primary" disabled={isSubmitting} onClick={handleSaveBulk}>
                {isSubmitting ? 'Saving…' : 'Save All'}
              </button>
            )}
          </div>
        </div>

        {/* Collapsible bulk editor */}
        {editorOpen && (
          <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Set monthly limits per category. Leave blank to skip.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {availableCategories.map(cat => (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-tertiary)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '8px', padding: '0.4rem 0.65rem' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', userSelect: 'none' }}>{cat}</label>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 500 }}>$</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="—"
                    className="budget-chip-input"
                    value={bulkBudgets[cat] || ''}
                    onChange={e => handleBulkChange(cat, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Budget cards grid */}
      {monthData.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {monthData.map(item => (
            <div key={item.id} className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.category}</span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => {
                      setEditorOpen(true)
                      handleBulkChange(item.category, item.amount.toString())
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                  >Edit</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}>Delete</button>
                </div>
              </div>

              <div className="budget-bar-bg" style={{ marginBottom: '0.6rem' }}>
                <div className={`budget-bar-fill ${item.overBudget ? 'over-budget' : ''}`} style={{ width: `${item.percent}%` }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: item.overBudget ? 'var(--danger-color)' : 'var(--text-secondary)' }}>
                  {item.overBudget ? `⚠ ${formatCurrency(item.spent - item.amount)} over` : `${formatCurrency(item.spent)} spent`}
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>limit {formatCurrency(item.amount)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem' }}>
          No budget rules for {selectedMonthStr}. Click <strong>Edit Budgets</strong> above to add some.
        </div>
      )}
    </div>
  )
}
