import { useState, useMemo } from 'react'
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
const YEARS = Array.from({length: 10}, (_, i) => (currentYear - 2 + i).toString())

export default function BudgetTracker({ transactions, budgets, onBudgetChange }: Props) {
  // Explicit controls for month and year forecasting
  const [selMonth, setSelMonth] = useState(MONTHS[new Date().getMonth()])
  const [selYear, setSelYear] = useState(currentYear.toString())
  const selectedMonthStr = `${selMonth} ${selYear}` // Standardized mapping e.g., "Dec 2025"

  // Form States
  const [formCategory, setFormCategory] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get dynamic categories for dropdown + common defaults
  const availableCategories = useMemo(() => {
    const cats = new Set<string>(['Groceries', 'Food & Drink', 'Gas', 'Shopping', 'Bills & Utilities', 'Entertainment', 'Personal', 'Travel'])
    transactions.forEach(t => {
      if (t.category) cats.add(t.category)
    })
    return Array.from(cats).sort()
  }, [transactions])

  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formCategory || !formAmount) return
    
    setIsSubmitting(true)
    try {
      await axios.post('/budgets', {
        month: selectedMonthStr,
        category: formCategory,
        amount: parseFloat(formAmount)
      })
      setFormCategory('')
      setFormAmount('')
      onBudgetChange() // Refresh global state
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

  const handleEdit = (budget: Budget) => {
      setFormCategory(budget.category)
      setFormAmount(budget.amount.toString())
      window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Current month's budget data bound with actual spends
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
       return {
         ...b,
         spent,
         percent,
         overBudget
       }
    })
  }, [budgets, selectedMonthStr, transactions])

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
  }

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <div className="filter-bar card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
             <h3 style={{ margin: 0, fontSize: '1rem' }}>Active Targets For:</h3>
             <select 
               value={selMonth} 
               onChange={e => setSelMonth(e.target.value)}
               className="filter-input"
               style={{ flex: 0, minWidth: '120px' }}
             >
               {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
             </select>
             <select 
               value={selYear} 
               onChange={e => setSelYear(e.target.value)}
               className="filter-input"
               style={{ flex: 0, minWidth: '100px' }}
             >
               {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
             </select>
         </div>
         
         <form onSubmit={handleAddBudget} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Category Configuration</label>
                <select 
                    required
                    value={formCategory} 
                    onChange={e => setFormCategory(e.target.value)}
                    className="filter-input"
                    style={{ width: '100%' }}
                >
                    <option value="" disabled>Select Category...</option>
                    {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Target Monthly Limit ($)</label>
                <input 
                    required
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="e.g. 500"
                    value={formAmount}
                    onChange={e => setFormAmount(e.target.value)}
                    className="filter-input"
                    style={{ width: '100%' }}
                />
            </div>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ height: '45px' }}>
                {isSubmitting ? 'Saving...' : 'Save Rule'}
            </button>
         </form>
      </div>

      <div className="dashboard-grid" style={{ marginTop: '1.5rem' }}>
          {monthData.map(item => (
              <div key={item.id} className="card col-span-6" style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <div>
                          <h3 className="card-title" style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{item.category}</h3>
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                              <button onClick={() => handleEdit(item)} className="btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}>Edit</button>
                              <button onClick={() => handleDelete(item.id)} className="btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', color: 'var(--danger-color)', border: '1px solid rgba(239, 68, 68, 0.4)' }}>Delete</button>
                          </div>
                      </div>
                      
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                           <strong style={{ color: item.overBudget ? 'var(--danger-color)' : 'var(--text-primary)', fontSize: '1rem' }}>
                               {formatCurrency(item.spent)}
                           </strong> / {formatCurrency(item.amount)}
                      </div>
                  </div>
                  
                  <div className="budget-bar-bg">
                       <div 
                         className={`budget-bar-fill ${item.overBudget ? 'over-budget' : ''}`} 
                         style={{ width: `${item.percent}%` }}
                       ></div>
                  </div>
                  
                  {item.overBudget && (
                      <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--danger-color)', fontWeight: 500 }}>
                          ⚠️ You are {formatCurrency(item.spent - item.amount)} over budget.
                      </div>
                  )}
              </div>
          ))}

          {monthData.length === 0 && (
              <div className="card col-span-12" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '4rem' }}>
                  No planning rules exist for {selectedMonthStr}. Define a primary target above to start tracking!
              </div>
          )}
      </div>
    </div>
  )
}
