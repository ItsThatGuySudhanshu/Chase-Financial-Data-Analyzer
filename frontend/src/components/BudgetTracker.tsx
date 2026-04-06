import { useState, useMemo, useEffect } from 'react'
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
  const [selMonth, setSelMonth] = useState(MONTHS[new Date().getMonth()])
  const [selYear, setSelYear] = useState(currentYear.toString())
  const selectedMonthStr = `${selMonth} ${selYear}` 

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bulkBudgets, setBulkBudgets] = useState<Record<string, string>>({})

  const availableCategories = useMemo(() => {
    const cats = new Set<string>(['Groceries', 'Food & Drink', 'Gas', 'Shopping', 'Bills & Utilities', 'Entertainment', 'Personal', 'Travel'])
    transactions.forEach(t => {
      if (t.category) cats.add(t.category)
    })
    return Array.from(cats).sort()
  }, [transactions])

  useEffect(() => {
     const currentMonthBudgets = budgets.filter(b => b.month === selectedMonthStr)
     const initialBulk: Record<string, string> = {}
     currentMonthBudgets.forEach(b => {
         initialBulk[b.category] = b.amount.toString()
     })
     setBulkBudgets(initialBulk)
  }, [budgets, selectedMonthStr])

  const handleBulkChange = (cat: string, val: string) => {
      setBulkBudgets(prev => ({...prev, [cat]: val}))
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

  // Pre-calculate current month's active spends
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

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
  }

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <div className="filter-bar card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
             <h3 style={{ margin: 0, fontSize: '1rem' }}>Editing Targets For:</h3>
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
         
         <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
             <h4 style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.85rem', textTransform: 'uppercase' }}>Bulk Configuration Editor</h4>
             
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                 {availableCategories.map(cat => (
                     <div key={cat} style={{ background: 'var(--bg-primary)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                         <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={cat}>
                             {cat}
                         </label>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                             <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>$</span>
                             <input 
                               type="number"
                               min="0"
                               step="1"
                               placeholder="0"
                               className="filter-input"
                               style={{ padding: '0.35rem 0.5rem', minWidth: '0', flex: 1 }}
                               value={bulkBudgets[cat] || ''}
                               onChange={e => handleBulkChange(cat, e.target.value)}
                             />
                         </div>
                     </div>
                 ))}
             </div>

             <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                 <button onClick={handleSaveBulk} className="btn btn-primary" disabled={isSubmitting} style={{ padding: '0.5rem 2rem' }}>
                     {isSubmitting ? 'Saving All...' : 'Save Bulk Targets'}
                 </button>
             </div>
         </div>
      </div>

      <div className="dashboard-grid" style={{ marginTop: '1.5rem' }}>
          {monthData.map(item => (
              <div key={item.id} className="card col-span-6" style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <div>
                          <h3 className="card-title" style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{item.category}</h3>
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                              <button onClick={() => {
                                  handleBulkChange(item.category, item.amount.toString())
                                  window.scrollTo({ top: 0, behavior: 'smooth' })
                              }} className="btn btn-sm btn-outline">Edit</button>
                              <button onClick={() => handleDelete(item.id)} className="btn btn-sm btn-danger">Delete</button>
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
                  No planning rules exist for {selectedMonthStr}. Define targets above to start tracking!
              </div>
          )}
      </div>
    </div>
  )
}
