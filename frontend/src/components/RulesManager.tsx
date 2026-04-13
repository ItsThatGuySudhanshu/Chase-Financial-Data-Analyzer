import React, { useState, useEffect } from 'react'
import axios from 'axios'

interface Rule {
  id: number
  description_pattern: string
  category_to_apply: string
}

interface Props {
  onRuleChange: () => void
}

const RulesManager: React.FC<Props> = ({ onRuleChange }) => {
  const [rules, setRules] = useState<Rule[]>([])
  const [newPattern, setNewPattern] = useState('')
  const [newCategory, setNewCategory] = useState('')

  const fetchRules = async () => {
    try {
      const res = await axios.get('/rules')
      setRules(res.data || [])
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchRules()
  }, [])

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPattern || !newCategory) return

    try {
      await axios.post('/rules', {
        description_pattern: newPattern,
        category_to_apply: newCategory
      })
      setNewPattern('')
      setNewCategory('')
      fetchRules()
      onRuleChange()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteRule = async (id: number) => {
    try {
      await axios.delete(`/rules/${id}`)
      fetchRules()
      onRuleChange()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="rules-manager card">
      <h2>Auto-Categorization Rules</h2>
      <p className="subtitle">Transactions matching these patterns will automatically use the specified category.</p>

      <form onSubmit={handleAddRule} className="rule-form">
        <input 
          type="text" 
          placeholder="Description pattern (e.g. Uber)" 
          value={newPattern}
          onChange={(e) => setNewPattern(e.target.value)}
        />
        <input 
          type="text" 
          placeholder="Category to apply" 
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
        />
        <button type="submit" className="btn-primary">Add Rule</button>
      </form>

      <div className="rules-list">
        {rules.length === 0 ? (
          <p className="empty-state">No rules defined yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Pattern</th>
                <th>Target Category</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map(rule => (
                <tr key={rule.id}>
                  <td><code>{rule.description_pattern}</code></td>
                  <td><span className="badge">{rule.category_to_apply}</span></td>
                  <td>
                    <button onClick={() => handleDeleteRule(rule.id)} className="btn-danger-text">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style>{`
        .rule-form {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          background: rgba(255,255,255,0.05);
          padding: 15px;
          border-radius: 8px;
        }
        .rule-form input {
          flex: 1;
          background: #1e1e1e;
          border: 1px solid #333;
          color: white;
          padding: 8px 12px;
          border-radius: 4px;
        }
        .btn-danger-text {
          background: none;
          border: none;
          color: #ff4d4d;
          cursor: pointer;
          font-weight: 600;
        }
        .btn-danger-text:hover {
          text-decoration: underline;
        }
        .subtitle {
          color: #888;
          margin-bottom: 20px;
        }
      `}</style>
    </div>
  )
}

export default RulesManager
