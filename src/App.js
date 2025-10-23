// src/App.js - Main React Component (Dashboard UI)
const { useState, useEffect } = React;

// Import AccountDetailView component
// Note: Component is loaded via script tag in HTML

function App() {
  const [pnl, setPnl] = useState(0);
  const [pnlChange, setPnlChange] = useState(0);
  const [lastDirective, setLastDirective] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Connected (Mock)');
  const [appState, setAppState] = useState('connecting');
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [theme, setTheme] = useState('light');

  // TopstepX state
  const [accounts, setAccounts] = useState([]);
  const [masterKillSwitch, setMasterKillSwitch] = useState(false);
  const [fills, setFills] = useState([]);

  // Account Detail View state
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [viewMode, setViewMode] = useState('overview'); // 'overview' or 'detail'

  // Cloud connection state
  const [cloudConnectionStatus, setCloudConnectionStatus] = useState('disconnected');

  // App version
  const [appVersion, setAppVersion] = useState('loading...');

  // Detect OS color scheme preference
  useEffect(() => {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // Set initial theme based on OS preference
    setTheme(darkModeQuery.matches ? 'dark' : 'light');

    // Listen for theme changes
    const handleThemeChange = (e) => {
      setTheme(e.matches ? 'dark' : 'light');
    };

    darkModeQuery.addEventListener('change', handleThemeChange);

    // Cleanup listener on unmount
    return () => darkModeQuery.removeEventListener('change', handleThemeChange);
  }, []);

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

      // Listen for application state changes
      window.electronAPI.onAppStateChanged((data) => {
        setAppState(data.state);
        setConnectionStatus(getStatusLabel(data.state));
      });

      // Get initial app state
      window.electronAPI.getAppState().then((data) => {
        setAppState(data.state);
        setConnectionStatus(getStatusLabel(data.state));
      });

      // Listen for TopstepX accounts loaded
      window.electronAPI.onAccountsLoaded((accountsData) => {
        console.log('Accounts loaded:', accountsData);
        setAccounts(accountsData);
      });

      // Listen for fill updates
      window.electronAPI.onFillUpdate((fillData) => {
        console.log('Fill received:', fillData);
        setFills(prevFills => [fillData, ...prevFills].slice(0, 10)); // Keep last 10 fills
      });

      // Listen for trading status changes from cloud
      window.electronAPI.onTradingStatusChanged((data) => {
        console.log('Trading status changed from cloud:', data);
        setMasterKillSwitch(data.enabled);
      });

      // Listen for cloud connection status changes
      window.electronAPI.onCloudConnectionChanged((data) => {
        console.log('Cloud connection status:', data.status);
        setCloudConnectionStatus(data.status);
      });

      // Load initial TopstepX data
      window.electronAPI.getTopstepAccounts().then((accountsData) => {
        if (accountsData && accountsData.length > 0) {
          setAccounts(accountsData);
        }
      });

      window.electronAPI.getMasterKillSwitch().then((enabled) => {
        setMasterKillSwitch(enabled);
      });

      // Get app version
      window.electronAPI.getAppVersion().then((version) => {
        setAppVersion(version);
      });
    }
  }, []);

  const getStatusLabel = (state) => {
    const labels = {
      'connecting': 'Connecting...',
      'connected': 'Connected (Mock)',
      'disconnected': 'Reconnecting...',
      'deactivated': 'Subscription Inactive',
      'warning': 'Action Required'
    };
    return labels[state] || 'Unknown';
  };

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

  // Kill switch handlers
  const handleMasterKillSwitchToggle = async () => {
    const newValue = !masterKillSwitch;
    const result = await window.electronAPI.setMasterKillSwitch(newValue);
    if (result.success) {
      setMasterKillSwitch(newValue);
    }
  };

  const handleAccountTradingToggle = async (accountId) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;

    const newValue = !account.tradingEnabled;
    const result = await window.electronAPI.setAccountTrading(accountId, newValue);

    if (result.success) {
      // Update local state
      setAccounts(prevAccounts =>
        prevAccounts.map(a =>
          a.id === accountId ? { ...a, tradingEnabled: newValue } : a
        )
      );
    }
  };

  // Account Detail View handlers
  const handleAccountSelect = (accountId) => {
    setSelectedAccountId(accountId);
    setViewMode('detail');
  };

  const handleBackToOverview = () => {
    setSelectedAccountId(null);
    setViewMode('overview');
  };

  const handleFlattenPositions = async (accountId) => {
    // TODO: Implement flatten positions functionality
    console.log(`Flattening positions for account ${accountId}`);
    // This would call the electron API to flatten all positions
    // const result = await window.electronAPI.flattenAccountPositions(accountId);
  };

  const handleRefreshAccount = async (accountId) => {
    // TODO: Implement refresh account functionality
    console.log(`Refreshing account ${accountId}`);
    // This would call the electron API to refresh account data
    // const result = await window.electronAPI.refreshAccountData(accountId);
  };

  const handleToggleBot = async (accountId, currentStatus) => {
    // TODO: Implement bot toggle functionality
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    console.log(`Toggling bot for account ${accountId} from ${currentStatus} to ${newStatus}`);
    // This would call the electron API to start/stop the bot
    // const result = await window.electronAPI.toggleBot(accountId, newStatus);
  };

  // Get selected account
  const selectedAccount = selectedAccountId 
    ? accounts.find(account => account.id === selectedAccountId)
    : null;

  return (
    <div className={`dashboard ${theme}`}>
      <header className="dashboard-header">
        <h1>CortexAlgo Dashboard</h1>
        <div className="header-controls">
          <button
            className={`kill-switch-header ${masterKillSwitch ? 'enabled' : 'disabled'}`}
            onClick={handleMasterKillSwitchToggle}
            title={masterKillSwitch ? 'Click to disable all trading' : 'Click to enable all trading'}
          >
            Trading: {masterKillSwitch ? 'ENABLED' : 'DISABLED'}
          </button>
          <div className="status-indicator">
            <span className={`status-dot ${cloudConnectionStatus === 'connected' ? 'connected' : cloudConnectionStatus === 'reconnecting' ? 'warning' : 'disconnected'}`}></span>
            <span>Cloud: {cloudConnectionStatus === 'connected' ? 'Connected' : cloudConnectionStatus === 'reconnecting' ? 'Reconnecting...' : cloudConnectionStatus === 'error' ? 'Disconnected' : 'Disconnected'}</span>
          </div>
        </div>
      </header>

      <div className="dashboard-content">

        {/* TopstepX Accounts */}
        {accounts.length > 0 && (
          <section className="accounts-section">
            {viewMode === 'overview' ? (
              <>
                <div className="section-header">
                  <h2>TopstepX Accounts ({accounts.length})</h2>
                  <div className="view-controls">
                    <span className="view-mode active">Overview</span>
                  </div>
                </div>
                <div className="accounts-grid">
                  {accounts.map((account) => (
                    <div key={account.id} className="account-card">
                      <div className="account-header">
                        <div className="account-info">
                          <h3>{account.name || `Account ${account.id}`}</h3>
                          <span className="account-id">ID: {account.id}</span>
                          <span className={`account-type-badge ${(account.accountType || '').toLowerCase()}`}>
                            {account.accountType}
                          </span>
                        </div>
                        <button
                          className={`account-toggle ${account.tradingEnabled ? 'enabled' : 'disabled'}`}
                          onClick={() => handleAccountTradingToggle(account.id)}
                          disabled={!masterKillSwitch}
                        >
                          {account.tradingEnabled ? 'Trading ON' : 'Trading OFF'}
                        </button>
                      </div>
                      <div className="account-stats">
                        <div className="stat">
                          <label>Balance</label>
                          <span>{formatCurrency(account.currentBalance || account.balance || 0)}</span>
                        </div>
                        <div className="stat">
                          <label>Daily PNL</label>
                          <span className={account.dailyPnl >= 0 ? 'positive' : 'negative'}>
                            {formatCurrency(account.dailyPnl || 0)}
                          </span>
                        </div>
                        <div className="stat">
                          <label>Positions</label>
                          <span>{(account.openPositions || []).length}</span>
                        </div>
                        <div className="stat">
                          <label>Bot Status</label>
                          <span className={`bot-status-text ${(account.botStatus || '').toLowerCase()}`}>
                            {account.botStatus === 'ACTIVE' ? '🟢 Active' : 
                             account.botStatus === 'PAUSED' ? '🟡 Paused' : 
                             account.botStatus === 'RULE_HALTED' ? '🔴 Halted' : '⚫ Inactive'}
                          </span>
                        </div>
                      </div>
                      <div className="account-actions">
                        <button 
                          className="detail-btn"
                          onClick={() => handleAccountSelect(account.id)}
                        >
                          📊 View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="section-header">
                  <div className="detail-navigation">
                    <button 
                      className="back-btn"
                      onClick={handleBackToOverview}
                    >
                      ← Back to Overview
                    </button>
                    <div className="account-tabs">
                      {accounts.map((account) => (
                        <button
                          key={account.id}
                          className={`account-tab ${selectedAccountId === account.id ? 'active' : ''}`}
                          onClick={() => handleAccountSelect(account.id)}
                        >
                          {account.name || `Account ${account.id}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="account-detail-container">
                  {selectedAccount && window.AccountDetailView && (
                    React.createElement(window.AccountDetailView, {
                      account: selectedAccount,
                      onFlattenPositions: handleFlattenPositions,
                      onRefreshAccount: handleRefreshAccount,
                      onToggleBot: handleToggleBot
                    })
                  )}
                </div>
              </>
            )}
          </section>
        )}

        {/* MOCK SECTIONS - Commented out until Phase 3 (Cloud WebSocket) */}
        {/*
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

        <section className="info-section">
          <div className="info-card">
            <h3>System Status</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Cloud Connection</label>
                <span className={`status-badge ${appState === 'connected' ? 'connected' : 'neutral'}`}>
                  {appState === 'connected' ? 'Active' : appState === 'connecting' ? 'Connecting...' : appState === 'disconnected' ? 'Reconnecting' : 'Inactive'}
                </span>
              </div>
              <div className="info-item">
                <label>Trading API</label>
                <span className={`status-badge ${appState === 'connected' ? 'connected' : 'neutral'}`}>
                  {appState === 'connected' ? 'Ready' : 'Standby'}
                </span>
              </div>
              <div className="info-item">
                <label>Mode</label>
                <span className="status-badge neutral">Mock</span>
              </div>
            </div>
          </div>
        </section>
        */}
      </div>

      <footer className="dashboard-footer">
        <p>CortexAlgo v{appVersion} | Cloud-Hybrid Trading Platform</p>
      </footer>
    </div>
  );
}
