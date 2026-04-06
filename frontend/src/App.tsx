import { useState, useEffect } from 'react'
import axios from 'axios'
import Dashboard from './components/Dashboard'
import Uploader from './components/Uploader'

// API base config
axios.defaults.baseURL = 'http://localhost:8080/api'

export type Transaction = {
  id: number
  transaction_date: string
  post_date: string
  description: string
  category: string
  type: string
  amount: number
  memo: string
}

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [summary, setSummary] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [txRes, sumRes] = await Promise.all([
        axios.get('/transactions'),
        axios.get('/summary')
      ])
      setTransactions(txRes.data || [])
      setSummary(sumRes.data || {})
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div className="app-container">
      <header className="navbar">
        <div className="logo">
          <div className="logo-icon"></div>
          <h1>Chase Analyzer</h1>
        </div>
        <Uploader onUploadSuccess={fetchData} />
      </header>

      <main className="main-content">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading your financial data...</p>
          </div>
        ) : (
          <Dashboard transactions={transactions} summary={summary} />
        )}
      </main>
    </div>
  )
}

export default App
