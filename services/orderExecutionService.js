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
    const token = await authService.getValidToken();

    // Map action to TopstepX order side
    const side = mapActionToSide(action);

    if (!side) {
      throw new Error(`Invalid action: ${action}`);
    }

    log.log(`📝 [OrderExecution] Submitting order: ${side} ${lots} ${symbol} for account ${accountId}`);

    // Submit order to TopstepX API
    const response = await axios.post(
      `${config.topstepx.apiBaseUrl}/Order/submit`,
      {
        accountId: accountId,
        symbol: symbol,
        side: side,
        quantity: lots,
        orderType: 'MARKET',
        timeInForce: 'DAY'
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
      lots
    });

    // Return error details
    return {
      success: false,
      error: error.message,
      errorDetails: error.response?.data || null,
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

module.exports = {
  submitOrder,
  mapActionToSide
};
