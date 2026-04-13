import React, { useState, useEffect } from 'react'
import axios from 'axios'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts'

interface TrendData {
  month: string
  total_spend: number
  prev_month: number
  percent_change: number
}

const Analytics: React.FC = () => {
  const [trends, setTrends] = useState<TrendData[]>([])

  useEffect(() => {
    fetchTrends()
  }, [])

  const fetchTrends = async () => {
    try {
      const res = await axios.get('/analytics/trends')
      setTrends(res.data || [])
    } catch (err) {
      console.error(err)
    }
  }

  const latest = trends.length > 0 ? trends[trends.length - 1] : null

  return (
    <div className="analytics-view">
      <div className="header-strip">
        <div className="stat-box">
          <span className="label">Latest Month Spend</span>
          <span className="value">${latest?.total_spend.toFixed(2) || '0.00'}</span>
        </div>
        <div className="stat-box">
          <span className="label">Month-over-Month Change</span>
          <span className={`value ${latest && latest.percent_change > 0 ? 'text-danger' : 'text-success'}`}>
            {latest ? `${latest.percent_change > 0 ? '+' : ''}${latest.percent_change.toFixed(1)}%` : '0%'}
          </span>
        </div>
      </div>

      <div className="charts-grid">
        <div className="card chart-card">
          <h2>Spending Trends</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="month" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #333' }}
                  itemStyle={{ color: '#0071e3' }}
                />
                <Bar dataKey="total_spend" fill="#0071e3" radius={[4, 4, 0, 0]} name="Total Spend" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card chart-card">
          <h2>Growth / (Decline) Velocity</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends.filter(t => t.prev_month > 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="month" stroke="#888" />
                <YAxis stroke="#888" unit="%" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #333' }}
                />
                <Line type="monotone" dataKey="percent_change" stroke="#ff4d4d" strokeWidth={2} name="MoM % Change" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <style>{`
        .analytics-view { display: flex; flex-direction: column; gap: 20px; }
        .header-strip { display: flex; gap: 20px; }
        .stat-box { 
          background: #252525; padding: 20px; border-radius: 12px; flex: 1; 
          display: flex; flex-direction: column; border: 1px solid #333;
        }
        .stat-box .label { font-size: 0.85rem; color: #888; text-transform: uppercase; }
        .stat-box .value { font-size: 1.8rem; font-weight: 700; margin-top: 5px; }
        .text-danger { color: #ff4d4d; }
        .text-success { color: #28a745; }
        .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .chart-card { min-height: 400px; }
        .chart-container { margin-top: 20px; }
      `}</style>
    </div>
  )
}

export default Analytics
