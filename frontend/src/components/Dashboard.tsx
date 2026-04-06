import { useMemo } from 'react'
import { Transaction } from '../App'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { format, parse } from 'date-fns'

type Props = {
  transactions: Transaction[]
  summary: Record<string, number>
}

// Colors for the pie chart
const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#facc15', '#10b981', '#06b6d4', '#64748b']

export default function Dashboard({ transactions, summary }: Props) {
  // Format summary for Pie Chart
  const pieData = useMemo(() => {
    return Object.entries(summary)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8) // Top 8 categories
  }, [summary])

  const totalSpent = useMemo(() => {
    return Object.values(summary).reduce((acc, curr) => acc + curr, 0)
  }, [summary])

  // Simple formatter
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
  }

  // Monthly spending for Bar Chart
  const barData = useMemo(() => {
    const months: Record<string, number> = {}
    transactions.forEach(t => {
      if (t.amount < 0) {
        // transaction_date is usually MM/DD/YYYY
        try {
          const date = parse(t.transaction_date, 'MM/dd/yyyy', new Date())
          const monthStr = format(date, 'MMM yyyy')
          months[monthStr] = (months[monthStr] || 0) + Math.abs(t.amount)
        } catch {
          // fallback if date parse fails
        }
      }
    })
    return Object.entries(months).map(([name, pv]) => ({ name, pv })).reverse()
  }, [transactions])

  const topMerchants = useMemo(() => {
    const merchants: Record<string, number> = {}
    let spendCount = 0
    let spendTotal = 0

    transactions.forEach(t => {
      if (t.amount < 0) {
        spendCount++
        spendTotal += Math.abs(t.amount)
        const name = (t.description || 'Unknown').trim()
        merchants[name] = (merchants[name] || 0) + Math.abs(t.amount)
      }
    })
    
    const sorted = Object.entries(merchants).map(([name, total]) => ({name, total})).sort((a,b) => b.total - a.total).slice(0, 5)
    return { list: sorted, count: spendCount, total: spendTotal }
  }, [transactions])

  const avgSpent = topMerchants.count > 0 ? (topMerchants.total / topMerchants.count) : 0

  return (
    <div className="dashboard-grid">
      {/* Top Stats */}
      <div className="card col-span-3">
        <h3 className="card-title">Total Spending</h3>
        <div className="stat-value">{formatCurrency(totalSpent)}</div>
      </div>
      <div className="card col-span-3">
        <h3 className="card-title">Transactions</h3>
        <div className="stat-value">{transactions.length}</div>
      </div>
      <div className="card col-span-3">
        <h3 className="card-title">Average Tx Size</h3>
        <div className="stat-value">{formatCurrency(avgSpent)}</div>
      </div>
      <div className="card col-span-3">
        <h3 className="card-title">Top Category</h3>
        <div className="stat-value" style={{fontSize: '1.25rem', marginTop: '10px'}}>
          {pieData.length > 0 ? pieData[0].name : 'N/A'}
        </div>
      </div>

      {/* Charts */}
      <div className="card col-span-6" style={{ height: '350px' }}>
        <h3 className="card-title">Spending by Category</h3>
        {pieData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
                label={({ name }) => name}
                labelLine={{ stroke: 'var(--text-secondary)' }}
              >
                {pieData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: 'none', borderRadius: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div style={{display: 'flex', alignItems: 'center', justifyContent:'center', height:'100%', color: 'var(--text-secondary)'}}>No data available</div>
        )}
      </div>

      <div className="card col-span-6" style={{ height: '350px' }}>
        <h3 className="card-title">Monthly Spending</h3>
        {barData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip 
                cursor={{fill: 'rgba(255,255,255,0.05)'}}
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: 'none', borderRadius: '8px' }}
              />
              <Bar dataKey="pv" fill="var(--accent-color)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{display: 'flex', alignItems: 'center', justifyContent:'center', height:'100%', color: 'var(--text-secondary)'}}>No data available</div>
        )}
      </div>

      <div className="card col-span-4" style={{ height: '350px' }}>
          <h3 className="card-title">Top Merchants</h3>
          {topMerchants.list.length > 0 ? (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                {topMerchants.list.map((m, i) => (
                   <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '0.5rem' }}>
                          <span style={{ color: 'var(--text-secondary)', marginRight: '0.5rem' }}>#{i+1}</span> 
                          {m.name}
                       </div>
                       <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--danger-color)' }}>
                          {formatCurrency(m.total)}
                       </div>
                   </div>
                ))}
             </div>
          ) : (
             <div style={{display: 'flex', alignItems: 'center', justifyContent:'center', height:'100%', color: 'var(--text-secondary)'}}>No data available</div>
          )}
      </div>

      {/* Transactions Table */}
      <div className="card col-span-8">
        <h3 className="card-title">Recent Transactions</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th style={{textAlign: 'right'}}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 15).map(t => (
                <tr key={t.id}>
                  <td>{t.transaction_date || t.post_date}</td>
                  <td>
                    {t.description}
                    {t.memo && <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>{t.memo}</div>}
                  </td>
                  <td>
                    {t.category && <span className="category-badge">{t.category}</span>}
                  </td>
                  <td className={`amount-cell ${t.amount < 0 ? 'amount-negative' : 'amount-positive'}`}>
                    {formatCurrency(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 && (
            <div style={{textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)'}}>
              No transactions yet. Please upload a CSV.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
