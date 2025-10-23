// src/components/AccountDetailView.js
// Account Detail View Component - Individual Account Management & Monitoring

const { useState, useEffect } = React;

function AccountDetailView({ account, onFlattenPositions, onRefreshAccount, onToggleBot }) {
  const [timeUntilClose, setTimeUntilClose] = useState(null);
  const [countdown, setCountdown] = useState('');

  // Calculate time until market close
  useEffect(() => {
    if (!account?.timeUntilClose) return;

    const updateCountdown = () => {
      const now = new Date();
      const closeTime = new Date(account.timeUntilClose);
      const timeDiff = closeTime - now;

      if (timeDiff <= 0) {
        setCountdown('Market Closed');
        return;
      }

      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

      setCountdown(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [account?.timeUntilClose]);

  if (!account) {
    return (
      <div className="account-detail-empty">
        <p>Select an account to view details</p>
      </div>
    );
  }

  // Calculate progress percentages
  const drawdownUsedPercent = Math.abs((account.currentDrawdown / account.maxDrawdown) * 100) || 0;
  const dailyLossUsedPercent = (account.dailyLossUsed / account.dailyLossLimit) * 100 || 0;
  const profitTargetPercent = account.dailyProfitTarget > 0 
    ? (account.dailyProfitProgress / account.dailyProfitTarget) * 100 
    : 0;

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: account.currency || 'USD'
    }).format(amount || 0);
  };

  // Format percentage
  const formatPercent = (value) => {
    return `${(value || 0).toFixed(2)}%`;
  };

  // Get bot status styling
  const getBotStatusClass = (status) => {
    switch (status) {
      case 'ACTIVE': return 'bot-status-active';
      case 'PAUSED': return 'bot-status-paused';
      case 'RULE_HALTED': return 'bot-status-halted';
      default: return 'bot-status-inactive';
    }
  };

  // Get bot status display text
  const getBotStatusText = (status) => {
    switch (status) {
      case 'ACTIVE': return 'Active';
      case 'PAUSED': return 'Paused';
      case 'RULE_HALTED': return 'Rule Halted';
      default: return 'Inactive';
    }
  };

  return (
    <div className="account-detail-view">
      {/* Account Header */}
      <div className="account-detail-header">
        <div className="account-title">
          <h2>{account.name}</h2>
          <span className="account-id">ID: {account.id}</span>
          <span className={`account-type ${account.accountType.toLowerCase()}`}>
            {account.accountType}
          </span>
        </div>
        <div className="account-actions">
          <button 
            className="action-btn refresh-btn"
            onClick={() => onRefreshAccount(account.id)}
            title="Refresh Account Data"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="account-detail-content">
        {/* Account Summary Panel */}
        <div className="summary-panel">
          <h3>Account Summary</h3>
          
          <div className="summary-grid">
            {/* Balance Section */}
            <div className="summary-card balance-card">
              <h4>Balance & Equity</h4>
              <div className="balance-info">
                <div className="balance-row">
                  <span>Starting Balance:</span>
                  <span className="value">{formatCurrency(account.startingBalance)}</span>
                </div>
                <div className="balance-row">
                  <span>Current Balance:</span>
                  <span className="value">{formatCurrency(account.currentBalance)}</span>
                </div>
                <div className="balance-row">
                  <span>Equity:</span>
                  <span className="value">{formatCurrency(account.equity)}</span>
                </div>
                <div className="balance-row">
                  <span>Unrealized P&L:</span>
                  <span className={`value ${account.unrealizedPnl >= 0 ? 'positive' : 'negative'}`}>
                    {formatCurrency(account.unrealizedPnl)}
                  </span>
                </div>
              </div>
            </div>

            {/* Drawdown Section */}
            <div className="summary-card drawdown-card">
              <h4>Drawdown Management</h4>
              <div className="drawdown-info">
                <div className="progress-item">
                  <div className="progress-header">
                    <span>Max Drawdown:</span>
                    <span className="value">{formatCurrency(account.maxDrawdown)}</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill drawdown-fill"
                      style={{ width: `${Math.min(drawdownUsedPercent, 100)}%` }}
                    ></div>
                  </div>
                  <div className="progress-details">
                    <span>Used: {formatCurrency(account.currentDrawdown)}</span>
                    <span>Remaining: {formatCurrency(account.drawdownRemaining)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Limits Section */}
            <div className="summary-card daily-limits-card">
              <h4>Daily Limits</h4>
              <div className="daily-limits-info">
                <div className="progress-item">
                  <div className="progress-header">
                    <span>Daily Loss Limit:</span>
                    <span className="value">{formatCurrency(account.dailyLossLimit)}</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill loss-fill"
                      style={{ width: `${Math.min(dailyLossUsedPercent, 100)}%` }}
                    ></div>
                  </div>
                  <div className="progress-details">
                    <span>Used: {formatCurrency(account.dailyLossUsed)}</span>
                    <span>Remaining: {formatCurrency(account.dailyLossRemaining)}</span>
                  </div>
                </div>

                {account.dailyProfitTarget > 0 && (
                  <div className="progress-item">
                    <div className="progress-header">
                      <span>Daily Profit Target:</span>
                      <span className="value">{formatCurrency(account.dailyProfitTarget)}</span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill profit-fill"
                        style={{ width: `${Math.min(profitTargetPercent, 100)}%` }}
                      ></div>
                    </div>
                    <div className="progress-details">
                      <span>Progress: {formatCurrency(account.dailyProfitProgress)}</span>
                      <span>{formatPercent(profitTargetPercent)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* EOD Flatten Countdown */}
            {account.eodFlattenEnabled && (
              <div className="summary-card eod-card">
                <h4>End of Day Flatten</h4>
                <div className="eod-info">
                  <div className="countdown-display">
                    <span className="countdown-time">{countdown}</span>
                    <span className="countdown-label">Until Market Close</span>
                  </div>
                  <div className="eod-status">
                    <span className={`status-indicator ${account.marketOpen ? 'open' : 'closed'}`}>
                      {account.marketOpen ? 'Market Open' : 'Market Closed'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bot Status & Controls Panel */}
        <div className="bot-panel">
          <h3>Bot Status & Controls</h3>
          
          <div className="bot-content">
            <div className="bot-status-section">
              <div className="bot-status-display">
                <div className={`bot-status-indicator ${getBotStatusClass(account.botStatus)}`}>
                  <span className="status-dot"></span>
                  <span className="status-text">{getBotStatusText(account.botStatus)}</span>
                </div>
                <div className="bot-mode">
                  <span>Mode: {account.botMode}</span>
                </div>
                {account.pauseReason && (
                  <div className="bot-pause-reason">
                    <span>Reason: {account.pauseReason}</span>
                  </div>
                )}
              </div>

              <div className="bot-last-action">
                <span>Last Action: {new Date(account.lastBotAction).toLocaleTimeString()}</span>
              </div>
            </div>

            <div className="bot-controls">
              <div className="control-buttons">
                <button 
                  className={`control-btn ${account.botStatus === 'ACTIVE' ? 'stop-btn' : 'start-btn'}`}
                  onClick={() => onToggleBot(account.id, account.botStatus)}
                  disabled={account.botStatus === 'RULE_HALTED'}
                >
                  {account.botStatus === 'ACTIVE' ? '⏸️ Stop Bot' : '▶️ Start Bot'}
                </button>
                
                <button 
                  className="control-btn flatten-btn"
                  onClick={() => onFlattenPositions(account.id)}
                  disabled={account.openPositions.length === 0}
                >
                  📊 Flatten Positions ({account.openPositions.length})
                </button>
              </div>

              {account.botStatus === 'RULE_HALTED' && (
                <div className="rule-halt-notice">
                  <p>⚠️ Bot halted due to risk rule: {account.ruleTriggered}</p>
                  <p>Manual intervention required to resume trading.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Open Positions Section */}
        {account.openPositions.length > 0 && (
          <div className="positions-panel">
            <h3>Open Positions ({account.openPositions.length})</h3>
            
            <div className="positions-table">
              <div className="table-header">
                <span>Symbol</span>
                <span>Side</span>
                <span>Size</span>
                <span>Avg Price</span>
                <span>Current Price</span>
                <span>Unrealized P&L</span>
                <span>Time</span>
              </div>
              
              {account.openPositions.map((position) => (
                <div key={position.id} className="table-row">
                  <span className="symbol">{position.symbol}</span>
                  <span className={`side ${position.side.toLowerCase()}`}>{position.side}</span>
                  <span className="size">{position.size}</span>
                  <span className="price">{position.averagePrice?.toFixed(2)}</span>
                  <span className="price">{position.currentPrice?.toFixed(2)}</span>
                  <span className={`pnl ${position.unrealizedPnl >= 0 ? 'positive' : 'negative'}`}>
                    {formatCurrency(position.unrealizedPnl)}
                  </span>
                  <span className="time">
                    {new Date(position.creationTimestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Fills Section */}
        {account.recentFills.length > 0 && (
          <div className="fills-panel">
            <h3>Recent Fills</h3>
            
            <div className="fills-table">
              <div className="table-header">
                <span>Symbol</span>
                <span>Side</span>
                <span>Quantity</span>
                <span>Price</span>
                <span>P&L</span>
                <span>Time</span>
              </div>
              
              {account.recentFills.slice(0, 10).map((fill, index) => (
                <div key={fill.id || index} className="table-row">
                  <span className="symbol">{fill.symbol}</span>
                  <span className={`side ${fill.side.toLowerCase()}`}>{fill.side}</span>
                  <span className="quantity">{fill.quantity}</span>
                  <span className="price">{fill.price?.toFixed(2)}</span>
                  <span className={`pnl ${fill.pnl >= 0 ? 'positive' : 'negative'}`}>
                    {formatCurrency(fill.pnl)}
                  </span>
                  <span className="time">
                    {new Date(fill.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Export for use in other components
window.AccountDetailView = AccountDetailView;