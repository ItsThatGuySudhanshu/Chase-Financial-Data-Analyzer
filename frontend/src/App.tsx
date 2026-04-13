import { useState, useEffect } from 'react'
import axios from 'axios'
import Dashboard from './components/Dashboard'
import Uploader from './components/Uploader'
import TransactionSearch from './components/TransactionSearch'
import BudgetTracker from './components/BudgetTracker'
import RulesManager from './components/RulesManager'
import Subscriptions from './components/Subscriptions'
import Analytics from './components/Analytics'
import SetupGuard from './components/SetupGuard'

axios.defaults.baseURL = '/api'

export type Transaction = {
  id: number
  transaction_date: string
  post_date: string
  description: string
  category: string
  type: string
  amount: number
  memo: string
  custom_category?: string
  tags?: string[]
}

export type Budget = {
  id: number
  month: string
  category: string
  amount: number
}

type Tab = 'dashboard' | 'transactions' | 'budget' | 'rules' | 'subscriptions' | 'analytics'

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [summary, setSummary] = useState<Record<string, number>>({})
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [txRes, sumRes, budRes] = await Promise.all([
        axios.get('/transactions'),
        axios.get('/summary'),
        axios.get('/budgets')
      ])
      setTransactions(txRes.data || [])
      setSummary(sumRes.data || {})
      setBudgets(budRes.data || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Refresh only budgets without toggling `loading` (which would unmount BudgetTracker)
  const fetchBudgets = async () => {
    try {
      const res = await axios.get('/budgets')
      setBudgets(res.data || [])
    } catch (error) {
      console.error("Error fetching budgets:", error)
    }
  }

  const fetchTransactions = async () => {
    try {
      const res = await axios.get('/transactions')
      setTransactions(res.data || [])
    } catch (error) {
      console.error("Error fetching transactions:", error)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <SetupGuard>
      <div className="app-container">
        <header className="navbar">
          <div className="logo" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('dashboard')}>
            <img src="/favicon.png" alt="Logo" className="logo-icon" />
            <h1>Chase Analyzer</h1>
          </div>

          <div className="nav-tabs">
            <button 
              className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              Dashboard
            </button>
            <button 
              className={`tab ${activeTab === 'transactions' ? 'active' : ''}`}
              onClick={() => setActiveTab('transactions')}
            >
              Transactions
            </button>
            <button 
              className={`tab ${activeTab === 'budget' ? 'active' : ''}`}
              onClick={() => setActiveTab('budget')}
            >
              Budget
            </button>
            <button 
              className={`tab ${activeTab === 'rules' ? 'active' : ''}`}
              onClick={() => setActiveTab('rules')}
            >
              Rules
            </button>
            <button 
              className={`tab ${activeTab === 'subscriptions' ? 'active' : ''}`}
              onClick={() => setActiveTab('subscriptions')}
            >
              Subscriptions
            </button>
            <button 
              className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              Analytics
            </button>
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
            <>
              {activeTab === 'dashboard' && <Dashboard transactions={transactions} summary={summary} />}
              {activeTab === 'transactions' && <TransactionSearch transactions={transactions} onUpdate={fetchTransactions} />}
              {activeTab === 'budget' && <BudgetTracker transactions={transactions} budgets={budgets} onBudgetChange={fetchBudgets} />}
              {activeTab === 'rules' && <RulesManager onRuleChange={fetchTransactions} />}
              {activeTab === 'subscriptions' && <Subscriptions />}
              {activeTab === 'analytics' && <Analytics />}
            </>
          )}
        </main>
      </div>
    </SetupGuard>
  )
}

export default App
