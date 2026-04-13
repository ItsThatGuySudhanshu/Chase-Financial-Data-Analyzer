import { useState, useEffect } from 'react'
import axios from 'axios'

interface Subscription {
  description: string
  amount: number
  frequency: string
  last_date: string
}

export default function Subscriptions() {
  const [subs, setSubs] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSubs()
  }, [])

  const fetchSubs = async () => {
    try {
      const res = await axios.get('/subscriptions')
      setSubs(res.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const totalMonthly = subs.reduce((acc, s) => acc + s.amount, 0)

  return (
    <div className="subscriptions-view">
      <div className="header-strip">
        <div className="stat-box">
          <span className="label">Monthly Recurring</span>
          <span className="value text-primary">${totalMonthly.toFixed(2)}</span>
        </div>
        <div className="stat-box">
          <span className="label">Active Subscriptions</span>
          <span className="value">{subs.length}</span>
        </div>
      </div>

      <div className="card">
        <h2>Detected Subscriptions</h2>
        <p className="subtitle">Automatically identified recurring payments appearing in 3+ separate months.</p>

        {loading ? (
          <p>Analyzing transactions...</p>
        ) : subs.length === 0 ? (
          <p className="empty-state">No recurring subscriptions detected yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Service / Description</th>
                <th>Amount</th>
                <th>Frequency</th>
                <th>Last Charged</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((sub, i) => (
                <tr key={i}>
                  <td className="font-bold">{sub.description}</td>
                  <td className="text-secondary">${sub.amount.toFixed(2)}</td>
                  <td><span className="badge badge-blue">{sub.frequency}</span></td>
                  <td>{sub.last_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style>{`
        .subscriptions-view {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .header-strip {
          display: flex;
          gap: 20px;
        }
        .stat-box {
          background: #252525;
          padding: 20px;
          border-radius: 12px;
          flex: 1;
          display: flex;
          flex-direction: column;
          border: 1px solid #333;
        }
        .stat-box .label {
          font-size: 0.85rem;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .stat-box .value {
          font-size: 1.8rem;
          font-weight: 700;
          margin-top: 5px;
        }
        .text-primary { color: #0071e3; }
        .badge-blue { background: rgba(0, 113, 227, 0.2); color: #0071e3; }
        .font-bold { font-weight: 600; }
        .subtitle { color: #888; margin-bottom: 20px; }
      `}</style>
    </div>
  )
}

