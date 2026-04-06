import { useState, useMemo } from 'react'
import axios from 'axios'
import { Transaction, Budget } from '../App'
import { format, parse } from 'date-fns'

type Props = {
  transactions: Transaction[]
  budgets: Budget[]
  onBudgetChange: () => void
}

export default function BudgetTracker({ transactions, budgets, onBudgetChange }: Props) {
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  
  // Form States
  const [formCategory, setFormCategory] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Derive unique months directly from data parsing
  const availableMonths = useMemo(() => {
    const months = new Set<string>()
    transactions.forEach(t => {
      try {
        const dateStr = t.transaction_date || t.post_date
        const date = parse(dateStr, 'MM/dd/yyyy', new Date())
        const monthStr = format(date, 'MMM yyyy')
        months.add(monthStr)
      } catch {}
    })
    const arrayMonths = Array.from(months)
    // Default the selected month if not set
    if (!selectedMonth && arrayMonths.length > 0) {
      setSelectedMonth(arrayMonths[0])
    }
    return arrayMonths
  }, [transactions, selectedMonth])

  // Get dynamic categories for dropdown
  const availableCategories = useMemo(() => {
    const cats = new Set<string>()
    transactions.forEach(t => {
      if (t.category) cats.add(t.category)
    })
    return Array.from(cats).sort()
  }, [transactions])

  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formCategory || !formAmount || !selectedMonth) return
    
    setIsSubmitting(true)
    try {
      await axios.post('/budgets', {
        month: selectedMonth,
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

  // Current month's budget data bound with actual spends
  const monthData = useMemo(() => {
    if (!selectedMonth) return []

    // 1. Get all budgets declared for this month
    const activeBudgets = budgets.filter(b => b.month === selectedMonth)

    // 2. Scan transactions matching this month
    const actualSpends: Record<string, number> = {}
    transactions.forEach(t => {
      // Only count negative amounts (spending)
      if (t.amount >= 0) return

      try {
        const dStr = t.transaction_date || t.post_date
        const date = parse(dStr, 'MM/dd/yyyy', new Date())
        const mStr = format(date, 'MMM yyyy')
        if (mStr === selectedMonth && t.category) {
            actualSpends[t.category] = (actualSpends[t.category] || 0) + Math.abs(t.amount)
        }
      } catch {}
    })

    // 3. Map together
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
  }, [budgets, selectedMonth, transactions])

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
  }

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <div className="filter-bar card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
             <h3 style={{ margin: 0, fontSize: '1rem' }}>Active Month:</h3>
             <select 
               value={selectedMonth} 
               onChange={e => setSelectedMonth(e.target.value)}
               className="filter-input"
               style={{ flex: 0, minWidth: '200px' }}
             >
               <option value="" disabled>Select Month...</option>
               {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
             </select>
         </div>
         
         <form onSubmit={handleAddBudget} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Category</label>
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
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Monthly Budget ($)</label>
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
                {isSubmitting ? 'Saving...' : 'Set Budget'}
            </button>
         </form>
      </div>

      <div className="dashboard-grid" style={{ marginTop: '1.5rem' }}>
          {monthData.map(item => (
              <div key={item.id} className="card col-span-6" style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <h3 className="card-title" style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{item.category}</h3>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                           <strong style={{ color: item.overBudget ? 'var(--danger-color)' : 'var(--text-primary)' }}>
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
                      <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--danger-color)' }}>
                          ⚠️ You are {formatCurrency(item.spent - item.amount)} over budget.
                      </div>
                  )}
              </div>
          ))}

          {monthData.length === 0 && selectedMonth && (
              <div className="card col-span-12" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem' }}>
                  No budgets configured for {selectedMonth}. Add a budget above to start tracking!
              </div>
          )}
      </div>
    </div>
  )
}
