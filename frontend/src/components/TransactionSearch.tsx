import { useState, useMemo } from 'react'
import { Transaction } from '../App'
import { format, parse } from 'date-fns'
import axios from 'axios'

type Props = {
  transactions: Transaction[]
  onUpdate: () => void
}

export default function TransactionSearch({ transactions, onUpdate }: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [monthFilter, setMonthFilter] = useState('All')
  const [yearFilter, setYearFilter] = useState('All')
  const [tagToSearch, setTagToSearch] = useState('')

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  // Derive unique years
  const availableYears = useMemo(() => {
    const years = new Set<string>()
    transactions.forEach(t => {
      try {
        const dateStr = t.transaction_date || t.post_date
        const date = parse(dateStr, 'MM/dd/yyyy', new Date())
        years.add(format(date, 'yyyy'))
      } catch { }
    })
    return Array.from(years).sort()
  }, [transactions])

  const availableTypes = useMemo(() => {
    const types = new Set<string>()
    transactions.forEach(t => { if (t.type) types.add(t.type) })
    return Array.from(types).sort()
  }, [transactions])

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
           if (monthFilter !== 'All') matchMonth = format(date, 'MMM') === monthFilter
           if (yearFilter !== 'All') matchYear = format(date, 'yyyy') === yearFilter
         } catch {
           matchMonth = false
           matchYear = false
         }
      }

      const matchTag = tagToSearch === '' || t.tags?.some(tag => tag.toLowerCase().includes(tagToSearch.toLowerCase()))
      
      return matchSearch && matchType && matchMonth && matchYear && matchTag
    })
  }, [transactions, searchTerm, typeFilter, monthFilter, yearFilter, tagToSearch])

  const breakdown = useMemo(() => {
    let spend = 0
    let income = 0
    filteredData.forEach(t => {
      if (t.amount < 0) spend += t.amount
      else income += t.amount
    })
    return { spend, income }
  }, [filteredData])

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
  }

  const handleUpdateCategory = async (id: number) => {
    const newCat = prompt("Enter new category:")
    if (!newCat) return
    try {
      await axios.put(`/transactions/${id}/category`, { category: newCat })
      onUpdate()
    } catch (err) { console.error(err) }
  }

  const handleAddTag = async (id: number) => {
    const tag = prompt("Enter tag (e.g. tax):")
    if (!tag) return
    try {
      await axios.post(`/transactions/tag`, { transaction_id: id, tag_name: tag.replace('#', '') })
      onUpdate()
    } catch (err) { console.error(err) }
  }

  const handleExport = () => {
    window.open('http://localhost:8080/api/export', '_blank')
  }

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <div className="filter-bar card">
         <input 
           type="text" 
           placeholder="Search text..." 
           value={searchTerm} 
           onChange={e => setSearchTerm(e.target.value)}
           className="filter-input"
         />
         <input 
           type="text" 
           placeholder="Filter by tag..." 
           value={tagToSearch} 
           onChange={e => setTagToSearch(e.target.value)}
           className="filter-input"
         />
         <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="filter-input">
           <option value="All">All Types</option>
           {availableTypes.map(type => <option key={type} value={type}>{type}</option>)}
         </select>
         <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="filter-input">
           <option value="All">All Months</option>
           {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
         </select>
         <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="filter-input">
           <option value="All">All Years</option>
           {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
         </select>
         <button className="btn-secondary" onClick={handleExport} style={{ marginLeft: 'auto' }}>Export CSV</button>
      </div>

      <div className="dashboard-grid" style={{ marginTop: '1.5rem' }}>
        <div className="card col-span-12">
          <h3 className="card-title">Filtered Spend</h3>
          <div className="stat-value negative">{formatCurrency(breakdown.spend)}</div>
        </div>

        <div className="card col-span-12">
          <h3 className="card-title">Transactions ({filteredData.length})</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description & Tags</th>
                  <th>Category</th>
                  <th>Actions</th>
                  <th style={{textAlign: 'right'}}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map(t => (
                  <tr key={t.id}>
                    <td>{t.transaction_date || t.post_date}</td>
                    <td>
                      <div style={{fontWeight: 'bold'}}>{t.description}</div>
                      {t.memo && <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>{t.memo}</div>}
                      <div className="tags-list">
                        {t.tags?.map(tag => (
                          <span key={tag} className="tag">#{tag}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className="category-badge">{t.custom_category || t.category}</span>
                      {t.custom_category && <div style={{fontSize: '0.6rem', color: '#0071e3', marginTop: '2px'}}>Manual Override</div>}
                    </td>
                    <td>
                      <div style={{display: 'flex', gap: '8px'}}>
                        <button className="sm-btn" onClick={() => handleUpdateCategory(t.id)}>Cat</button>
                        <button className="sm-btn" onClick={() => handleAddTag(t.id)}>+Tag</button>
                      </div>
                    </td>
                    <td className={`amount-cell ${t.amount < 0 ? 'amount-negative' : 'amount-positive'}`}>
                      {formatCurrency(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        .tag { font-size: 0.7rem; background: #333; color: #aaa; padding: 2px 6px; border-radius: 4px; margin-right: 4px; }
        .sm-btn { font-size: 0.7rem; padding: 2px 6px; cursor: pointer; background: #222; border: 1px solid #444; color: #888; border-radius: 4px; }
        .sm-btn:hover { background: #333; color: white; }
        .tags-list { margin-top: 4px; display: flex; flex-wrap: wrap; gap: 4px; }
        .btn-secondary { background: #333; border: none; padding: 8px 16px; border-radius: 8px; color: white; cursor: pointer; }
      `}</style>
    </div>
  )
}
