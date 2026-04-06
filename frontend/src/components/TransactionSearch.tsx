import { useState, useMemo } from 'react'
import { Transaction } from '../App'
import { format, parse } from 'date-fns'

type Props = {
  transactions: Transaction[]
}

export default function TransactionSearch({ transactions }: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [monthFilter, setMonthFilter] = useState('All')
  const [yearFilter, setYearFilter] = useState('All')

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  // Derive unique years directly from data parsing
  const availableYears = useMemo(() => {
    const years = new Set<string>()
    transactions.forEach(t => {
      try {
        const dateStr = t.transaction_date || t.post_date
        const date = parse(dateStr, 'MM/dd/yyyy', new Date())
        years.add(format(date, 'yyyy'))
      } catch {
        // silently ignore broken dates
      }
    })
    // Returning sorted years
    return Array.from(years).sort()
  }, [transactions])

  // Derive unique transaction types
  const availableTypes = useMemo(() => {
    const types = new Set<string>()
    transactions.forEach(t => {
      if (t.type) types.add(t.type)
    })
    return Array.from(types).sort()
  }, [transactions])

  // Filter the transactions based on current local react state
  const filteredData = useMemo(() => {
    return transactions.filter(t => {
      const descrMatch = (t.description || '').toLowerCase().includes(searchTerm.toLowerCase())
      const memoMatch = (t.memo || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchSearch = descrMatch || memoMatch
      
      const matchType = typeFilter === 'All' || t.type === typeFilter
      
      let matchMonth = true
      let matchYear = true
      if (monthFilter !== 'All' || yearFilter !== 'All') {
         try {
           const dateStr = t.transaction_date || t.post_date
           const date = parse(dateStr, 'MM/dd/yyyy', new Date())
           if (monthFilter !== 'All') {
               matchMonth = format(date, 'MMM') === monthFilter
           }
           if (yearFilter !== 'All') {
               matchYear = format(date, 'yyyy') === yearFilter
           }
         } catch {
           matchMonth = false
           matchYear = false
         }
      }
      
      return matchSearch && matchType && matchMonth && matchYear
    })
  }, [transactions, searchTerm, typeFilter, monthFilter, yearFilter])

  // Recalculate local breakdown for the top summary cards
  const breakdown = useMemo(() => {
    let spend = 0
    let income = 0
    filteredData.forEach(t => {
      if (t.amount < 0) {
        spend += t.amount
      } else {
        income += t.amount
      }
    })
    return { spend, income }
  }, [filteredData])

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
  }

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <div className="filter-bar card">
         <input 
           type="text" 
           placeholder="Search merchant or keywords..." 
           value={searchTerm} 
           onChange={e => setSearchTerm(e.target.value)}
           className="filter-input"
         />
         <select 
           value={typeFilter} 
           onChange={e => setTypeFilter(e.target.value)}
           className="filter-input"
         >
           <option value="All">All Types</option>
           {availableTypes.map(type => <option key={type} value={type}>{type}</option>)}
         </select>
         <select 
           value={monthFilter} 
           onChange={e => setMonthFilter(e.target.value)}
           className="filter-input"
         >
           <option value="All">All Months</option>
           {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
         </select>
         <select 
           value={yearFilter} 
           onChange={e => setYearFilter(e.target.value)}
           className="filter-input"
         >
           <option value="All">All Years</option>
           {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
         </select>
      </div>

      <div className="dashboard-grid" style={{ marginTop: '1.5rem' }}>
        <div className="card col-span-12">
          <h3 className="card-title">Filtered Spend</h3>
          <div className="stat-value negative">{formatCurrency(breakdown.spend)}</div>
        </div>

        <div className="card col-span-12">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 className="card-title" style={{ margin: 0 }}>Transactions ({filteredData.length})</h3>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th style={{textAlign: 'right'}}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map(t => (
                  <tr key={t.id}>
                    <td>{t.transaction_date || t.post_date}</td>
                    <td>
                      {t.description}
                      {t.memo && <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>{t.memo}</div>}
                    </td>
                    <td>
                      {t.category && <span className="category-badge">{t.category}</span>}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {t.type}
                    </td>
                    <td className={`amount-cell ${t.amount < 0 ? 'amount-negative' : 'amount-positive'}`}>
                      {formatCurrency(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredData.length === 0 && (
                <div style={{textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)'}}>
                  No results match your filters.
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
