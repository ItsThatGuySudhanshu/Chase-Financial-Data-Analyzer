import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface SetupGuardProps {
  children: React.ReactNode;
}

export default function SetupGuard({ children }: SetupGuardProps) {
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const res = await axios.get('/setup/status');
      setIsInitialized(res.data.initialized);
    } catch (err) {
      console.error('Failed to check setup status:', err);
      setError('Could not connect to the backend analyzer.');
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    setLoading(true);
    try {
      await axios.post('/setup/initialize');
      setIsInitialized(true);
      // Reload page to ensure everything re-syncs
      window.location.reload();
    } catch (err) {
      console.error('Failed to initialize:', err);
      setError('Initialization failed. Check if the app has permission to write in this folder.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="setup-container">
        <div className="spinner"></div>
        <p>Checking workspace...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="setup-container">
        <div className="setup-card error">
          <h2>Connection Error</h2>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={checkStatus}>Retry</button>
        </div>
      </div>
    );
  }

  if (isInitialized === false) {
    return (
      <div className="setup-container">
        <div className="setup-card glass">
          <div className="setup-header">
            <img src="/favicon.png" alt="Logo" className="logo-icon large" />
            <h2>Welcome to Chase Analyzer</h2>
          </div>
          <p className="setup-desc">
            To get started, we need to initialize a workspace for your database and transaction CSVs. 
            This will create a <strong>chase-analyzer-data</strong> folder in your application directory.
          </p>
          <div className="setup-actions">
            <button className="btn btn-primary btn-large" onClick={handleInitialize}>
              Initialize Workspace
            </button>
          </div>
          <p className="setup-footer">
            Your data is stored locally and never leaves your machine.
          </p>
        </div>

        <style>{`
          .setup-container {
            height: 100vh;
            width: 100vw;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-primary);
            color: var(--text-primary);
            padding: 2rem;
          }
          .setup-card {
            max-width: 480px;
            width: 100%;
            padding: 3rem;
            border-radius: 20px;
            text-align: center;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            box-shadow: 0 10px 40px rgba(0,0,0,0.4);
          }
          .setup-card.glass {
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
          }
          .setup-header {
            margin-bottom: 2rem;
          }
          .logo-icon.large {
            width: 80px;
            height: 80px;
            margin-bottom: 1.5rem;
          }
          .setup-card h2 {
            font-size: 2rem;
            margin-bottom: 1rem;
            background: linear-gradient(to right, #fff, var(--text-secondary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          .setup-desc {
            color: var(--text-secondary);
            margin-bottom: 2.5rem;
            line-height: 1.6;
          }
          .setup-actions {
            margin-bottom: 2rem;
          }
          .btn-large {
            width: 100%;
            padding: 1rem;
            font-size: 1rem;
            justify-content: center;
          }
          .setup-footer {
            font-size: 0.8rem;
            color: var(--text-secondary);
            opacity: 0.6;
          }
          .setup-card.error {
            border-color: var(--danger-color);
          }
        `}</style>
      </div>
    );
  }

  return <>{children}</>;
}
