import { useMemo } from 'react'
import { Transaction } from '../App'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { format, parse } from 'date-fns'

type Props = {
  transactions: Transaction[]
  summary: Record<string, number>
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#facc15', '#10b981', '#06b6d4', '#64748b']

export default function Dashboard({ transactions, summary }: Props) {
  const pieData = useMemo(() => {
    return Object.entries(summary)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [summary])

  const totalSpent = useMemo(() => {
    return Object.values(summary).reduce((acc, curr) => acc + curr, 0)
  }, [summary])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
  }

  const barData = useMemo(() => {
    const months: Record<string, number> = {}
    transactions.forEach(t => {
      if (t.amount < 0) {
        try {
          const date = parse(t.transaction_date, 'MM/dd/yyyy', new Date())
          const monthStr = format(date, 'MMM yy')
          months[monthStr] = (months[monthStr] || 0) + Math.abs(t.amount)
        } catch {}
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
    const sorted = Object.entries(merchants)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 7)
    return { list: sorted, count: spendCount, total: spendTotal }
  }, [transactions])

  const avgSpent = topMerchants.count > 0 ? topMerchants.total / topMerchants.count : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Row 1 — Stat strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {[
          { label: 'Total Spending', value: formatCurrency(totalSpent) },
          { label: 'Transactions', value: transactions.length.toLocaleString() },
          { label: 'Avg. Transaction', value: formatCurrency(avgSpent) },
          { label: 'Top Category', value: pieData.length > 0 ? pieData[0].name : 'N/A' },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: '1.25rem 1.5rem' }}>
            <h3 className="card-title" style={{ marginBottom: '0.5rem' }}>{s.label}</h3>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.5px' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Row 2 — Bar chart full width */}
      <div className="card" style={{ height: '260px' }}>
        <h3 className="card-title">Monthly Spending</h3>
        {barData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
              />
              <Bar dataKey="pv" fill="var(--accent-color)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>No data</div>
        )}
      </div>

      {/* Row 3 — Pie + Top Merchants side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="card" style={{ height: '380px' }}>
          <h3 className="card-title">Spending by Category</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={120}
                  paddingAngle={4}
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
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>No data</div>
          )}
        </div>

        <div className="card" style={{ height: '380px' }}>
          <h3 className="card-title">Top Merchants</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '1rem', overflow: 'hidden' }}>
            {topMerchants.list.map((m, i) => {
              const pct = (m.total / topMerchants.total) * 100
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      <span style={{ color: 'var(--text-secondary)', marginRight: '0.4rem' }}>#{i + 1}</span>
                      {m.name.length > 28 ? m.name.slice(0, 28) + '…' : m.name}
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--danger-color)' }}>
                      {formatCurrency(m.total)}
                    </span>
                  </div>
                  <div className="budget-bar-bg">
                    <div className="budget-bar-fill" style={{ width: `${pct}%`, opacity: 0.7 }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Row 4 — Recent Transactions centered full width */}
      <div className="card">
        <h3 className="card-title">Recent Transactions</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 15).map(t => (
                <tr key={t.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{t.transaction_date || t.post_date}</td>
                  <td>
                    {t.description}
                    {t.memo && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t.memo}</div>}
                  </td>
                  <td>{t.category && <span className="category-badge">{t.category}</span>}</td>
                  <td className={`amount-cell ${t.amount < 0 ? 'amount-negative' : 'amount-positive'}`}>
                    {formatCurrency(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              No transactions yet. Upload a CSV to get started.
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
