import { useState, useMemo, useCallback } from 'react'
import { Transaction } from '../App'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { format, parse } from 'date-fns'

type Props = {
  transactions: Transaction[]
  summary: Record<string, number>
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#facc15', '#10b981', '#06b6d4', '#64748b']

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const parseDate = (t: Transaction): Date | null => {
  const raw = t.transaction_date || t.post_date
  if (!raw) return null
  try {
    return parse(raw, 'MM/dd/yyyy', new Date())
  } catch {
    return null
  }
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Dashboard({ transactions }: Props) {
  /* ---- Date range state ---- */
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  /* ---- Selected month for pie drilldown ---- */
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)

  /* ---- Transactions filtered by the date picker ---- */
  const filtered = useMemo(() => {
    if (!startDate && !endDate) return transactions
    return transactions.filter(t => {
      const d = parseDate(t)
      if (!d) return false
      if (startDate && d < new Date(startDate + 'T00:00:00')) return false
      if (endDate && d > new Date(endDate + 'T23:59:59')) return false
      return true
    })
  }, [transactions, startDate, endDate])

  /* ---- Summary from filtered transactions ---- */
  const filteredSummary = useMemo(() => {
    const cats: Record<string, number> = {}
    filtered.forEach(t => {
      if (t.amount < 0 && t.category) {
        cats[t.category] = (cats[t.category] || 0) + Math.abs(t.amount)
      }
    })
    return cats
  }, [filtered])

  /* ---- Pie data: either full range OR single month ---- */
  const pieData = useMemo(() => {
    let source: Record<string, number>

    if (selectedMonth) {
      // Build category breakdown for just the clicked month
      source = {}
      filtered.forEach(t => {
        if (t.amount >= 0) return
        const d = parseDate(t)
        if (!d) return
        const mStr = format(d, 'MMM yy')
        if (mStr === selectedMonth && t.category) {
          source[t.category] = (source[t.category] || 0) + Math.abs(t.amount)
        }
      })
    } else {
      source = filteredSummary
    }

    return Object.entries(source)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [filtered, filteredSummary, selectedMonth])

  /* ---- Totals ---- */
  const totalSpent = useMemo(() =>
    Object.values(filteredSummary).reduce((a, c) => a + c, 0)
  , [filteredSummary])

  /* ---- Bar data ---- */
  const barData = useMemo(() => {
    const months: Record<string, number> = {}
    filtered.forEach(t => {
      if (t.amount < 0) {
        const d = parseDate(t)
        if (d) {
          const monthStr = format(d, 'MMM yy')
          months[monthStr] = (months[monthStr] || 0) + Math.abs(t.amount)
        }
      }
    })
    // Sort chronologically
    const entries = Object.entries(months).map(([name, pv]) => ({ name, pv }))
    entries.sort((a, b) => {
      const da = parse(a.name, 'MMM yy', new Date())
      const db = parse(b.name, 'MMM yy', new Date())
      return da.getTime() - db.getTime()
    })
    return entries
  }, [filtered])

  /* ---- Top merchants ---- */
  const topMerchants = useMemo(() => {
    const merchants: Record<string, number> = {}
    let spendCount = 0
    let spendTotal = 0
    filtered.forEach(t => {
      if (t.amount < 0) {
        if (selectedMonth) {
          const d = parseDate(t)
          if (!d || format(d, 'MMM yy') !== selectedMonth) return
        }
        spendCount++
        spendTotal += Math.abs(t.amount)
        const name = (t.description || 'Unknown').trim()
        merchants[name] = (merchants[name] || 0) + Math.abs(t.amount)
      }
    })
    const sorted = Object.entries(merchants)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)
    return { list: sorted, count: spendCount, total: spendTotal }
  }, [filtered, selectedMonth])

  const avgSpent = topMerchants.count > 0 ? topMerchants.total / topMerchants.count : 0

  /* ---- Bar click handler ---- */
  const handleBarClick = useCallback((data: any) => {
    if (!data || !data.activeLabel) return
    const clicked = data.activeLabel as string
    setSelectedMonth(prev => (prev === clicked ? null : clicked))
  }, [])

  /* ---- Clear date range ---- */
  const hasDateFilter = startDate || endDate
  const clearDates = () => {
    setStartDate('')
    setEndDate('')
    setSelectedMonth(null)
  }

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Row 0 — Date Range Picker */}
      <div className="card" style={{ padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Date Range</span>
          <input
            type="date"
            className="filter-input"
            style={{ flex: 0, minWidth: '150px' }}
            value={startDate}
            onChange={e => { setStartDate(e.target.value); setSelectedMonth(null) }}
          />
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>to</span>
          <input
            type="date"
            className="filter-input"
            style={{ flex: 0, minWidth: '150px' }}
            value={endDate}
            onChange={e => { setEndDate(e.target.value); setSelectedMonth(null) }}
          />
          {hasDateFilter && (
            <button className="btn btn-sm btn-outline" onClick={clearDates} style={{ marginLeft: 'auto' }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Row 1 — Stat strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {[
          { label: 'Total Spending', value: formatCurrency(totalSpent) },
          { label: 'Transactions', value: filtered.length.toLocaleString() },
          { label: 'Avg. Transaction', value: formatCurrency(avgSpent) },
          { label: 'Top Category', value: pieData.length > 0 ? pieData[0].name : 'N/A' },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: '1.25rem 1.5rem' }}>
            <h3 className="card-title" style={{ marginBottom: '0.5rem' }}>{s.label}</h3>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.5px' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Row 2 — Bar chart (clickable) */}
      <div className="card" style={{ height: '260px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <h3 className="card-title" style={{ marginBottom: 0 }}>Monthly Spending</h3>
          {selectedMonth && (
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              Viewing <strong>{selectedMonth}</strong>
              <button
                onClick={() => setSelectedMonth(null)}
                style={{
                  background: 'rgba(59,130,246,0.15)',
                  border: 'none',
                  color: 'var(--accent-color)',
                  borderRadius: '4px',
                  padding: '0.15rem 0.4rem',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                }}
              >✕</button>
            </span>
          )}
        </div>
        {barData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} onClick={handleBarClick} style={{ cursor: 'pointer' }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
              />
              <Bar dataKey="pv" name="Total Spend" radius={[4, 4, 0, 0]}>
                {barData.map((entry, index) => (
                  <Cell
                    key={`bar-${index}`}
                    fill={selectedMonth === entry.name ? '#8b5cf6' : 'var(--accent-color)'}
                    opacity={selectedMonth && selectedMonth !== entry.name ? 0.35 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>No data</div>
        )}
      </div>

      {/* Row 3 — Pie + Top Merchants side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="card" style={{ height: '380px' }}>
          <h3 className="card-title">
            {selectedMonth ? `Spending by Category — ${selectedMonth}` : 'Spending by Category'}
          </h3>
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

      {/* Row 4 — Recent Transactions */}
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
              {filtered.slice(0, 15).map(t => (
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
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              No transactions{hasDateFilter ? ' in this date range' : ' yet. Upload a CSV to get started'}.
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
