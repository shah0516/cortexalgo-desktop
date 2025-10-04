// src/App.js - Main React Component (Dashboard UI)
const { useState, useEffect } = React;

function App() {
  const [pnl, setPnl] = useState(0);
  const [pnlChange, setPnlChange] = useState(0);
  const [lastDirective, setLastDirective] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Connected (Mock)');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    // Set up listeners for events from the Main Process via the secure bridge
    if (window.electronAPI) {
      // Listen for PNL updates
      window.electronAPI.onPnlUpdate((data) => {
        setPnl(data.pnl);
        setPnlChange(data.change);
        setLastUpdate(new Date(data.timestamp));
      });

      // Listen for trade directives
      window.electronAPI.onTradeDirective((data) => {
        setLastDirective(data);
      });
    }
  }, []);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getPnlClass = () => {
    if (pnl > 0) return 'positive';
    if (pnl < 0) return 'negative';
    return 'neutral';
  };

  const getChangeClass = () => {
    if (pnlChange > 0) return 'positive';
    if (pnlChange < 0) return 'negative';
    return 'neutral';
  };

  const getActionClass = (action) => {
    if (action.includes('LONG')) return 'action-long';
    if (action.includes('SHORT')) return 'action-short';
    return 'action-neutral';
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Execution Agent Dashboard</h1>
        <div className="status-indicator">
          <span className="status-dot connected"></span>
          <span>{connectionStatus}</span>
        </div>
      </header>

      <div className="dashboard-content">
        {/* PNL Section */}
        <section className="pnl-section">
          <div className="section-header">
            <h2>Performance</h2>
            <span className="last-update">Last Update: {formatTime(lastUpdate)}</span>
          </div>
          <div className="pnl-display">
            <div className="pnl-main">
              <label>Daily PNL</label>
              <div className={`pnl-value ${getPnlClass()}`}>
                {formatCurrency(pnl)}
              </div>
            </div>
            <div className="pnl-change">
              <label>Last Change</label>
              <div className={`change-value ${getChangeClass()}`}>
                {pnlChange > 0 ? '+' : ''}{formatCurrency(pnlChange)}
              </div>
            </div>
          </div>
        </section>

        {/* Trade Directive Section */}
        <section className="directive-section">
          <div className="section-header">
            <h2>Last Received Command</h2>
          </div>
          {lastDirective ? (
            <div className="directive-card">
              <div className="directive-header">
                <span className={`directive-action ${getActionClass(lastDirective.action)}`}>
                  {lastDirective.action}
                </span>
                <span className="directive-time">
                  {formatTime(new Date(lastDirective.timestamp))}
                </span>
              </div>
              <div className="directive-details">
                <div className="detail-item">
                  <label>Directive ID</label>
                  <span>{lastDirective.directiveId}</span>
                </div>
                <div className="detail-item">
                  <label>Instrument</label>
                  <span className="instrument">{lastDirective.instrument}</span>
                </div>
                <div className="detail-item">
                  <label>Lots</label>
                  <span>{lastDirective.lots}</span>
                </div>
                <div className="detail-item">
                  <label>Order Type</label>
                  <span>{lastDirective.orderType}</span>
                </div>
                <div className="detail-item">
                  <label>Price</label>
                  <span>{formatCurrency(parseFloat(lastDirective.price))}</span>
                </div>
                <div className="detail-item full-width">
                  <label>Reason</label>
                  <span>{lastDirective.reason}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="no-directive">
              <p>Waiting for first trade directive...</p>
            </div>
          )}
        </section>

        {/* System Info Section */}
        <section className="info-section">
          <div className="info-card">
            <h3>System Status</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Cloud Connection</label>
                <span className="status-badge connected">Active</span>
              </div>
              <div className="info-item">
                <label>Trading API</label>
                <span className="status-badge connected">Ready</span>
              </div>
              <div className="info-item">
                <label>Mode</label>
                <span className="status-badge neutral">Mock</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer className="dashboard-footer">
        <p>Execution Agent v1.0.0 | Trading Platform</p>
      </footer>
    </div>
  );
}
