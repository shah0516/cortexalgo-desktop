/**
 * Order Execution Service
 *
 * Handles order submission to TopstepX API based on cloud signals
 */

const axios = require('axios');
const authService = require('./authService');
const config = require('../config');
const log = console;

/**
 * Submit order to TopstepX API
 * @param {Object} params - Order parameters
 * @param {string} params.accountId - TopstepX account ID
 * @param {string} params.action - Order action (ENTRY_LONG, ENTRY_SHORT, EXIT)
 * @param {string} params.symbol - Instrument symbol (NQ, ES, etc.)
 * @param {number} params.lots - Number of contracts
 * @returns {Promise<Object>} Order response from TopstepX
 */
async function submitOrder({ accountId, action, symbol, lots }) {
  try {
    // Get valid TopstepX auth token
    const token = await authService.getAccessToken();

    // Map action to TopstepX order side
    const side = mapActionToSide(action);

    if (!side) {
      throw new Error(`Invalid action: ${action}`);
    }

    log.log(`📝 [OrderExecution] Submitting order: ${side} ${lots} ${symbol} for account ${accountId}`);

    // Map symbol to TopstepX contract ID
    const contractId = mapSymbolToContractId(symbol);

    if (!contractId) {
      throw new Error(`Unknown symbol: ${symbol}`);
    }

    // Submit order to TopstepX API
    const response = await axios.post(
      `${config.API_ENDPOINT}/api/Order/place`,
      {
        accountId: parseInt(accountId),
        contractId: contractId,
        side: side === 'BUY' ? 0 : 1, // 0 = Buy, 1 = Sell
        type: 2, // 2 = Market order
        size: lots
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      }
    );

    log.log(`✅ [OrderExecution] Order submitted successfully:`, {
      orderId: response.data.orderId,
      status: response.data.status,
      accountId,
      symbol,
      side,
      quantity: lots
    });

    return {
      success: true,
      orderId: response.data.orderId,
      status: response.data.status,
      accountId,
      symbol,
      side,
      quantity: lots,
      submittedAt: new Date().toISOString(),
      rawResponse: response.data
    };

  } catch (error) {
    log.error(`❌ [OrderExecution] Order submission failed:`, {
      error: error.message,
      accountId,
      action,
      symbol,
      lots,
      statusCode: error.response?.status,
      responseData: error.response?.data,
      validationErrors: error.response?.data?.errors ? JSON.stringify(error.response.data.errors, null, 2) : null,
      endpoint: `${config.API_ENDPOINT}/api/Order/place`
    });

    // Return error details
    return {
      success: false,
      error: error.message,
      errorDetails: error.response?.data || null,
      statusCode: error.response?.status,
      accountId,
      action,
      symbol,
      lots
    };
  }
}

/**
 * Map cloud signal action to TopstepX order side
 * @param {string} action - Cloud signal action
 * @returns {string|null} TopstepX order side or null if invalid
 */
function mapActionToSide(action) {
  const actionMap = {
    'ENTRY_LONG': 'BUY',
    'ENTRY_SHORT': 'SELL',
    'EXIT': 'CLOSE', // Close position (TopstepX will determine direction)
    'EXIT_LONG': 'SELL',
    'EXIT_SHORT': 'BUY'
  };

  return actionMap[action] || null;
}

/**
 * Map symbol to TopstepX contract ID
 * @param {string} symbol - Instrument symbol (NQ, ES, etc.)
 * @returns {string|null} TopstepX contract ID or null if unknown
 */
function mapSymbolToContractId(symbol) {
  const symbolMap = {
    'NQ': 'CON.F.US.ENQ.Z25', // NQ December 2025
    'ES': 'CON.F.US.EP.Z25',  // ES December 2025
    'YM': 'CON.F.US.YM.Z25',  // YM December 2025
    'RTY': 'CON.F.US.RTY.Z25' // RTY December 2025
  };

  return symbolMap[symbol] || null;
}

module.exports = {
  submitOrder,
  mapActionToSide,
  mapSymbolToContractId
};
