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

  return (
    <div className="dashboard-grid">
      {/* Top Stats */}
      <div className="card col-span-4">
        <h3 className="card-title">Total Spending</h3>
        <div className="stat-value">{formatCurrency(totalSpent)}</div>
      </div>
      <div className="card col-span-4">
        <h3 className="card-title">Transactions</h3>
        <div className="stat-value">{transactions.length}</div>
      </div>
      <div className="card col-span-4">
        <h3 className="card-title">Largest Category</h3>
        <div className="stat-value" style={{fontSize: '1.5rem', marginTop: '10px'}}>
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

      {/* Transactions Table */}
      <div className="card col-span-12">
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
              {transactions.slice(0, 50).map(t => (
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
