// services/accountManager.js
// Multi-Account State Management & Kill Switch Logic

// Account state storage
let accounts = new Map(); // accountId -> account object with state
let masterKillSwitch = false; // Global trading on/off

/**
 * Initialize accounts from TopstepX API response
 * @param {Array} accountList - Array of account objects from TopstepX
 */
function initializeAccounts(accountList) {
  if (!Array.isArray(accountList)) {
    console.error('[AccountManager] Invalid account list provided');
    return;
  }

  console.log(`[AccountManager] Initializing ${accountList.length} account(s)...`);

  accountList.forEach(account => {
    const accountState = {
      ...account,
      tradingEnabled: true, // Per-account toggle (default: enabled)
      pnl: 0,
      openPositions: [],
      recentFills: [],
      lastUpdate: new Date()
    };

    accounts.set(account.id, accountState);
    console.log(`[AccountManager] Account initialized: ${account.name} (ID: ${account.id})`);
  });

  console.log(`[AccountManager] Total accounts: ${accounts.size}`);
}

/**
 * Get all accounts
 * @returns {Array} Array of account objects
 */
function getAllAccounts() {
  return Array.from(accounts.values());
}

/**
 * Get a specific account by ID
 * @param {number} accountId - Account ID
 * @returns {object|null} Account object or null if not found
 */
function getAccount(accountId) {
  return accounts.get(accountId) || null;
}

/**
 * Update account state (from SignalR or API)
 * @param {number} accountId - Account ID
 * @param {object} updates - Object with properties to update
 */
function updateAccount(accountId, updates) {
  const account = accounts.get(accountId);

  if (!account) {
    console.warn(`[AccountManager] Cannot update unknown account: ${accountId}`);
    return;
  }

  Object.assign(account, updates, { lastUpdate: new Date() });
  console.log(`[AccountManager] Account ${accountId} updated`);
}

/**
 * Add a fill to account
 * @param {number} accountId - Account ID
 * @param {object} fillData - Fill object from SignalR
 */
function addFill(accountId, fillData) {
  const account = accounts.get(accountId);

  if (!account) {
    console.warn(`[AccountManager] Cannot add fill to unknown account: ${accountId}`);
    return;
  }

  account.recentFills.unshift(fillData);

  // Keep only last 50 fills
  if (account.recentFills.length > 50) {
    account.recentFills = account.recentFills.slice(0, 50);
  }

  console.log(`[AccountManager] Fill added to account ${accountId}`);
}

/**
 * Update account PNL
 * @param {number} accountId - Account ID
 * @param {number} pnl - New PNL value
 */
function updatePnl(accountId, pnl) {
  updateAccount(accountId, { pnl });
}

/**
 * Get cumulative PNL across all accounts
 * @returns {number} Total PNL
 */
function getCumulativePnl() {
  let total = 0;

  accounts.forEach(account => {
    total += account.pnl || 0;
  });

  return total;
}

/**
 * Set master kill switch
 * @param {boolean} enabled - true = trading enabled, false = all trading disabled
 */
function setMasterKillSwitch(enabled) {
  masterKillSwitch = enabled;
  console.log(`[AccountManager] Master kill switch: ${enabled ? 'ENABLED' : 'DISABLED'}`);
}

/**
 * Get master kill switch status
 * @returns {boolean} Master kill switch status
 */
function getMasterKillSwitch() {
  return masterKillSwitch;
}

/**
 * Enable/disable trading for a specific account
 * @param {number} accountId - Account ID
 * @param {boolean} enabled - Trading enabled/disabled
 */
function setAccountTrading(accountId, enabled) {
  const account = accounts.get(accountId);

  if (!account) {
    console.warn(`[AccountManager] Cannot set trading for unknown account: ${accountId}`);
    return false;
  }

  account.tradingEnabled = enabled;
  console.log(`[AccountManager] Account ${accountId} trading: ${enabled ? 'ENABLED' : 'DISABLED'}`);
  return true;
}

/**
 * Check if trading is allowed for a specific account
 * Considers both master kill switch AND per-account toggle
 * @param {number} accountId - Account ID
 * @returns {boolean} true if trading is allowed
 */
function canTrade(accountId) {
  // Master kill switch takes precedence
  if (!masterKillSwitch) {
    return false;
  }

  const account = accounts.get(accountId);

  if (!account) {
    console.warn(`[AccountManager] Cannot check trading status for unknown account: ${accountId}`);
    return false;
  }

  return account.tradingEnabled;
}

/**
 * Get account trading status summary
 * @returns {object} Status object with master switch and per-account status
 */
function getTradingStatus() {
  const accountStatuses = {};

  accounts.forEach((account, accountId) => {
    accountStatuses[accountId] = {
      enabled: account.tradingEnabled,
      canTrade: canTrade(accountId)
    };
  });

  return {
    masterEnabled: masterKillSwitch,
    accounts: accountStatuses
  };
}

/**
 * Reset all account state (useful for testing/debugging)
 */
function reset() {
  accounts.clear();
  masterKillSwitch = false;
  console.log('[AccountManager] State reset');
}

module.exports = {
  initializeAccounts,
  getAllAccounts,
  getAccount,
  updateAccount,
  addFill,
  updatePnl,
  getCumulativePnl,
  setMasterKillSwitch,
  getMasterKillSwitch,
  setAccountTrading,
  canTrade,
  getTradingStatus,
  reset
};
