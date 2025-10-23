// services/mockAccountsService.js
// Mock Accounts Data Service for Development Testing

/**
 * Generate realistic mock account data for development
 * @returns {Array} Array of mock account objects matching TopstepX API structure
 */
function generateMockAccounts() {
  const mockAccounts = [
    {
      // TopstepX API basic structure
      id: 123456,
      name: "Express Eval - NQ",
      balance: 50000.00,
      canTrade: true,
      isVisible: true,
      
      // Extended fields for detailed view
      accountType: "Evaluation",
      startingBalance: 50000.00,
      currentBalance: 51250.75,
      equity: 51200.75,
      buyingPower: 200000.00,
      cashBalance: 48750.25,
      dayTradeBalance: 45000.00,
      
      // PNL tracking
      pnl: 1250.75,
      dailyPnl: 875.50,
      unrealizedPnl: 325.25,
      realizedPnl: 550.25,
      
      // Drawdown & Risk Management
      maxDrawdown: -2500.00,
      currentDrawdown: -125.50,
      drawdownRemaining: 2374.50, // maxDrawdown - currentDrawdown
      drawdownPercentage: 5.01, // (currentDrawdown / startingBalance) * 100
      
      // Daily limits
      dailyLossLimit: 2000.00,
      dailyLossUsed: 125.50,
      dailyLossRemaining: 1874.50,
      dailyProfitTarget: 3000.00,
      dailyProfitProgress: 875.50,
      dailyProfitPercentage: 29.18, // (dailyProfitProgress / dailyProfitTarget) * 100
      
      // Trading status
      tradingEnabled: true,
      status: "ACTIVE",
      currency: "USD",
      
      // Bot status
      botStatus: "ACTIVE",
      botMode: "Auto Trading",
      lastBotAction: new Date(Date.now() - 300000), // 5 minutes ago
      
      // Market hours & EOD flatten
      marketOpen: true,
      timeUntilClose: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours until close
      eodFlattenEnabled: true,
      
      // Risk limits
      riskLimits: {
        maxDailyLoss: 2000,
        maxTotalLoss: 5000,
        maxContracts: 10,
        maxPositionSize: 5
      },
      
      // Additional tracking
      openPositions: [],
      recentFills: [],
      lastUpdate: new Date(),
      createdAt: "2024-01-15T10:30:00Z"
    },
    {
      // TopstepX API basic structure
      id: 234567,
      name: "Express Eval - ES",
      balance: 30000.00,
      canTrade: true,
      isVisible: true,
      
      // Extended fields for detailed view
      accountType: "Evaluation",
      startingBalance: 30000.00,
      currentBalance: 30850.20,
      equity: 30850.20,
      buyingPower: 120000.00,
      cashBalance: 29425.80,
      dayTradeBalance: 28500.00,
      
      // PNL tracking
      pnl: 850.20,
      dailyPnl: 425.80,
      unrealizedPnl: 150.40,
      realizedPnl: 275.60,
      
      // Drawdown & Risk Management
      maxDrawdown: -1800.00,
      currentDrawdown: -75.20,
      drawdownRemaining: 1724.80,
      drawdownPercentage: 2.51,
      
      // Daily limits
      dailyLossLimit: 1500.00,
      dailyLossUsed: 75.20,
      dailyLossRemaining: 1424.80,
      dailyProfitTarget: 1800.00,
      dailyProfitProgress: 425.80,
      dailyProfitPercentage: 23.66,
      
      // Trading status
      tradingEnabled: true,
      status: "ACTIVE",
      currency: "USD",
      
      // Bot status
      botStatus: "ACTIVE",
      botMode: "Auto Trading",
      lastBotAction: new Date(Date.now() - 600000), // 10 minutes ago
      
      // Market hours & EOD flatten
      marketOpen: true,
      timeUntilClose: new Date(Date.now() + 4 * 60 * 60 * 1000),
      eodFlattenEnabled: true,
      
      // Risk limits
      riskLimits: {
        maxDailyLoss: 1500,
        maxTotalLoss: 3000,
        maxContracts: 5,
        maxPositionSize: 3
      },
      
      // Positions
      openPositions: [
        {
          id: 6124,
          accountId: 234567,
          contractId: "CON.F.US.ES.H25",
          symbol: "ESH25",
          side: "LONG",
          size: 2,
          averagePrice: 5825.50,
          currentPrice: 5835.75,
          unrealizedPnl: 205.00,
          creationTimestamp: new Date(Date.now() - 3600000) // 1 hour ago
        }
      ],
      recentFills: [],
      lastUpdate: new Date(),
      createdAt: "2024-02-20T14:15:00Z"
    },
    {
      // TopstepX API basic structure
      id: 345678,
      name: "Funded Trader - MNQ",
      balance: 100000.00,
      canTrade: true,
      isVisible: true,
      
      // Extended fields for detailed view
      accountType: "Funded",
      startingBalance: 100000.00,
      currentBalance: 102150.25,
      equity: 102150.25,
      buyingPower: 400000.00,
      cashBalance: 98950.75,
      dayTradeBalance: 95000.00,
      
      // PNL tracking
      pnl: 2150.25,
      dailyPnl: 950.75,
      unrealizedPnl: 450.50,
      realizedPnl: 1699.75,
      
      // Drawdown & Risk Management
      maxDrawdown: -4200.00,
      currentDrawdown: -250.25,
      drawdownRemaining: 3949.75,
      drawdownPercentage: 2.50,
      
      // Daily limits
      dailyLossLimit: 4000.00,
      dailyLossUsed: 250.25,
      dailyLossRemaining: 3749.75,
      dailyProfitTarget: 0, // Funded accounts typically don't have daily profit targets
      dailyProfitProgress: 950.75,
      dailyProfitPercentage: 0,
      
      // Trading status
      tradingEnabled: true,
      status: "ACTIVE",
      currency: "USD",
      
      // Bot status
      botStatus: "ACTIVE",
      botMode: "Aggressive Trading",
      lastBotAction: new Date(Date.now() - 120000), // 2 minutes ago
      
      // Market hours & EOD flatten
      marketOpen: true,
      timeUntilClose: new Date(Date.now() + 4 * 60 * 60 * 1000),
      eodFlattenEnabled: false, // Funded accounts may not require EOD flatten
      
      // Risk limits
      riskLimits: {
        maxDailyLoss: 4000,
        maxTotalLoss: 8000,
        maxContracts: 20,
        maxPositionSize: 10
      },
      
      // Positions
      openPositions: [
        {
          id: 6125,
          accountId: 345678,
          contractId: "CON.F.US.MNQ.H25",
          symbol: "MNQH25",
          side: "SHORT",
          size: 3,
          averagePrice: 20150.25,
          currentPrice: 20125.75,
          unrealizedPnl: 184.50,
          creationTimestamp: new Date(Date.now() - 1800000) // 30 minutes ago
        }
      ],
      recentFills: [
        {
          id: "fill_001",
          accountId: 345678,
          symbol: "MNQH25",
          side: "BUY",
          quantity: 1,
          price: 20140.00,
          timestamp: new Date(Date.now() - 7200000), // 2 hours ago
          pnl: 285.25
        }
      ],
      lastUpdate: new Date(),
      createdAt: "2024-01-05T09:45:00Z"
    },
    {
      // TopstepX API basic structure
      id: 456789,
      name: "Practice Account - YM",
      balance: 25000.00,
      canTrade: false, // This one is disabled for testing
      isVisible: true,
      
      // Extended fields for detailed view
      accountType: "Practice",
      startingBalance: 25000.00,
      currentBalance: 25320.70,
      equity: 25320.70,
      buyingPower: 100000.00,
      cashBalance: 24580.30,
      dayTradeBalance: 23500.00,
      
      // PNL tracking
      pnl: 320.70,
      dailyPnl: 180.30,
      unrealizedPnl: 90.40,
      realizedPnl: 230.30,
      
      // Drawdown & Risk Management
      maxDrawdown: -1200.00,
      currentDrawdown: -45.70,
      drawdownRemaining: 1154.30,
      drawdownPercentage: 1.83,
      
      // Daily limits
      dailyLossLimit: 1000.00,
      dailyLossUsed: 45.70,
      dailyLossRemaining: 954.30,
      dailyProfitTarget: 1200.00,
      dailyProfitProgress: 180.30,
      dailyProfitPercentage: 15.03,
      
      // Trading status
      tradingEnabled: false,
      status: "ACTIVE",
      currency: "USD",
      
      // Bot status - PAUSED for testing
      botStatus: "PAUSED",
      botMode: "User Paused",
      lastBotAction: new Date(Date.now() - 3600000), // 1 hour ago
      pauseReason: "User manually paused bot",
      
      // Market hours & EOD flatten
      marketOpen: true,
      timeUntilClose: new Date(Date.now() + 4 * 60 * 60 * 1000),
      eodFlattenEnabled: true,
      
      // Risk limits
      riskLimits: {
        maxDailyLoss: 1000,
        maxTotalLoss: 2500,
        maxContracts: 3,
        maxPositionSize: 2
      },
      
      // Positions
      openPositions: [],
      recentFills: [
        {
          id: "fill_002",
          accountId: 456789,
          symbol: "YMH25",
          side: "SELL",
          quantity: 1,
          price: 38950.00,
          timestamp: new Date(Date.now() - 10800000), // 3 hours ago
          pnl: 125.50
        }
      ],
      lastUpdate: new Date(),
      createdAt: "2024-03-10T16:20:00Z"
    },
    {
      // TopstepX API basic structure
      id: 567890,
      name: "Scaling Plan - RTY",
      balance: 75000.00,
      canTrade: true,
      isVisible: true,
      
      // Extended fields for detailed view
      accountType: "Scaling",
      startingBalance: 75000.00,
      currentBalance: 76420.85,
      equity: 76420.85,
      buyingPower: 300000.00,
      cashBalance: 73850.45,
      dayTradeBalance: 71200.00,
      
      // PNL tracking
      pnl: 1420.85,
      dailyPnl: 650.45,
      unrealizedPnl: 270.40,
      realizedPnl: 1150.45,
      
      // Drawdown & Risk Management
      maxDrawdown: -3100.00,
      currentDrawdown: -180.55,
      drawdownRemaining: 2919.45,
      drawdownPercentage: 2.41,
      
      // Daily limits
      dailyLossLimit: 3000.00,
      dailyLossUsed: 180.55,
      dailyLossRemaining: 2819.45,
      dailyProfitTarget: 2250.00,
      dailyProfitProgress: 650.45,
      dailyProfitPercentage: 28.91,
      
      // Trading status
      tradingEnabled: true,
      status: "ACTIVE",
      currency: "USD",
      
      // Bot status - RULE HALTED for demonstration
      botStatus: "RULE_HALTED",
      botMode: "Risk Rule Triggered",
      lastBotAction: new Date(Date.now() - 1800000), // 30 minutes ago
      pauseReason: "Daily loss limit approaching (60% used)",
      ruleTriggered: "DAILY_LOSS_THRESHOLD",
      
      // Market hours & EOD flatten
      marketOpen: true,
      timeUntilClose: new Date(Date.now() + 4 * 60 * 60 * 1000),
      eodFlattenEnabled: true,
      
      // Risk limits
      riskLimits: {
        maxDailyLoss: 3000,
        maxTotalLoss: 6000,
        maxContracts: 15,
        maxPositionSize: 8
      },
      
      // Positions
      openPositions: [
        {
          id: 6126,
          accountId: 567890,
          contractId: "CON.F.US.RTY.H25",
          symbol: "RTYH25",
          side: "LONG",
          size: 4,
          averagePrice: 2185.50,
          currentPrice: 2192.25,
          unrealizedPnl: 270.00,
          creationTimestamp: new Date(Date.now() - 900000) // 15 minutes ago
        }
      ],
      recentFills: [
        {
          id: "fill_003",
          accountId: 567890,
          symbol: "RTYH25", 
          side: "BUY",
          quantity: 2,
          price: 2180.75,
          timestamp: new Date(Date.now() - 5400000), // 1.5 hours ago
          pnl: 195.50
        },
        {
          id: "fill_004",
          accountId: 567890,
          symbol: "RTYH25",
          side: "SELL",
          quantity: 1,
          price: 2188.25,
          timestamp: new Date(Date.now() - 3600000), // 1 hour ago
          pnl: 87.75
        }
      ],
      lastUpdate: new Date(),
      createdAt: "2024-02-28T11:10:00Z"
    }
  ];

  return mockAccounts;
}

/**
 * Generate mock fill data for testing
 * @param {number} accountId - Account ID to generate fill for
 * @returns {Object} Mock fill object
 */
function generateMockFill(accountId) {
  const symbols = ["NQH25", "ESH25", "MNQH25", "YMH25", "RTYH25"];
  const sides = ["BUY", "SELL"];
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  const side = sides[Math.floor(Math.random() * sides.length)];
  
  // Generate realistic prices based on symbol
  const basePrices = {
    "NQH25": 18500,
    "ESH25": 5800,
    "MNQH25": 20100,
    "YMH25": 38900,
    "RTYH25": 2180
  };
  
  const basePrice = basePrices[symbol];
  const price = basePrice + (Math.random() * 100 - 50); // +/- 50 points
  const quantity = Math.floor(Math.random() * 5) + 1; // 1-5 contracts
  const pnl = (Math.random() * 500 - 250); // +/- $250
  
  return {
    id: `fill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    accountId: accountId,
    symbol: symbol,
    side: side,
    quantity: quantity,
    price: parseFloat(price.toFixed(2)),
    timestamp: new Date(),
    pnl: parseFloat(pnl.toFixed(2))
  };
}

/**
 * Generate mock account update for testing real-time updates
 * @param {Object} account - Existing account object
 * @returns {Object} Mock account update object
 */
function generateMockAccountUpdate(account) {
  // Simulate small balance changes
  const balanceChange = (Math.random() * 200 - 100); // +/- $100
  const pnlChange = (Math.random() * 100 - 50); // +/- $50
  
  return {
    accountId: account.id,
    balance: account.balance + balanceChange,
    pnl: account.pnl + pnlChange,
    dailyPnl: account.dailyPnl + (pnlChange * 0.5),
    unrealizedPnl: account.unrealizedPnl + (Math.random() * 50 - 25),
    lastUpdate: new Date()
  };
}

/**
 * Simulate live account data changes for development
 * @param {Function} onAccountUpdate - Callback for account updates
 * @param {Function} onFill - Callback for new fills
 * @param {Array} accounts - Array of accounts to simulate updates for
 * @returns {Function} Cleanup function to stop simulation
 */
function startMockLiveUpdates(onAccountUpdate, onFill, accounts = []) {
  console.log('[MockAccountsService] Starting live mock updates simulation...');
  
  if (!accounts.length) {
    accounts = generateMockAccounts();
  }
  
  // Account updates every 10-30 seconds
  const accountUpdateInterval = setInterval(() => {
    const account = accounts[Math.floor(Math.random() * accounts.length)];
    const update = generateMockAccountUpdate(account);
    
    console.log(`[MockAccountsService] Simulating account update for account ${account.id}`);
    
    if (onAccountUpdate) {
      onAccountUpdate(update);
    }
  }, 15000 + Math.random() * 15000); // 15-30 seconds
  
  // Fill updates every 30-120 seconds
  const fillUpdateInterval = setInterval(() => {
    const account = accounts[Math.floor(Math.random() * accounts.length)];
    const fill = generateMockFill(account.id);
    
    console.log(`[MockAccountsService] Simulating fill for account ${account.id}`);
    
    if (onFill) {
      onFill(fill);
    }
  }, 45000 + Math.random() * 75000); // 45-120 seconds
  
  // Return cleanup function
  return () => {
    console.log('[MockAccountsService] Stopping mock updates simulation...');
    clearInterval(accountUpdateInterval);
    clearInterval(fillUpdateInterval);
  };
}

/**
 * Get mock credentials for development
 * @returns {Object} Mock credentials object
 */
function getMockCredentials() {
  return {
    username: "dev_user@cortexalgo.com",
    apiKey: "mock_api_key_dev_12345"
  };
}

/**
 * Mock authentication that always succeeds
 * @returns {Promise<string>} Mock auth token
 */
async function mockAuthenticate() {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('[MockAccountsService] Mock authentication successful');
  return "mock_auth_token_" + Date.now();
}

module.exports = {
  generateMockAccounts,
  generateMockFill,
  generateMockAccountUpdate,
  startMockLiveUpdates,
  getMockCredentials,
  mockAuthenticate
};