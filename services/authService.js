// services/authService.js
// TopstepX Authentication Service - Token Management & Account Fetching

const axios = require('axios');
const config = require('../config');

// Module-level cache for token and expiry time
let currentToken = null;
let tokenExpiryTime = null;
let currentCredentials = null;

/**
 * Initialize the auth service with user credentials
 * @param {Object} credentials - {username, apiKey}
 */
function initialize(credentials) {
  if (!credentials || !credentials.username || !credentials.apiKey) {
    throw new Error('Invalid credentials provided to authService');
  }

  currentCredentials = credentials;
  console.log(`[AuthService] Initialized for user: ${credentials.username.substring(0, 3)}***`);
}

/**
 * Performs full authentication with API Key
 * @returns {Promise<string>} Authentication token
 */
async function loginWithApiKey() {
  if (!currentCredentials) {
    throw new Error('AuthService not initialized. Call initialize() first.');
  }

  const authUrl = `${config.API_ENDPOINT}/api/Auth/loginKey`;
  const authData = {
    userName: currentCredentials.username,
    apiKey: currentCredentials.apiKey
  };

  // Sanitize for logging
  const sanitizedUsername = currentCredentials.username.length > 6
    ? `${currentCredentials.username.substring(0, 3)}***${currentCredentials.username.substring(currentCredentials.username.length - 3)}`
    : '***';

  console.log(`[AuthService] Authenticating with TopstepX API...`);
  console.log(`[AuthService] Username: ${sanitizedUsername}`);

  try {
    const response = await axios.post(authUrl, authData, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.data && response.data.token) {
      console.log('[AuthService] Authentication successful. Token received.');
      currentToken = response.data.token;
      tokenExpiryTime = Date.now() + config.TOKEN_LIFETIME_MS;
      return currentToken;
    }

    throw new Error('Token not found in login response');
  } catch (error) {
    console.error('[AuthService] Authentication failed:', error.response ? error.response.data : error.message);
    throw error;
  }
}

/**
 * Validates current token and gets a refreshed one
 * @param {string} tokenToValidate - Current token
 * @returns {Promise<string|null>} New token or null if validation failed
 */
async function validateAndRefreshToken(tokenToValidate) {
  const validateUrl = `${config.API_ENDPOINT}/api/Auth/validate`;

  console.log('[AuthService] Validating and refreshing token...');

  try {
    const response = await axios.post(
      validateUrl,
      {}, // Empty body
      {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${tokenToValidate}`
        }
      }
    );

    if (response.data && response.data.success && response.data.newToken) {
      console.log('[AuthService] Token refreshed successfully.');
      currentToken = response.data.newToken;
      tokenExpiryTime = Date.now() + config.TOKEN_LIFETIME_MS;
      return currentToken;
    } else {
      console.warn('[AuthService] Token validation failed. Will attempt full login.');
      return null;
    }
  } catch (error) {
    console.error('[AuthService] Token validation error:', error.response ? error.response.data : error.message);
    return null;
  }
}

/**
 * Gets a valid access token (uses cache, refreshes, or performs full login as needed)
 * @returns {Promise<string>} Valid authentication token
 */
async function getAccessToken() {
  // If we have a valid cached token, return it
  if (currentToken && tokenExpiryTime && Date.now() < tokenExpiryTime) {
    return currentToken;
  }

  // If token exists but might be expired, try to refresh it
  if (currentToken) {
    const refreshedToken = await validateAndRefreshToken(currentToken);
    if (refreshedToken) {
      return refreshedToken;
    }
  }

  // No token or refresh failed - perform full login
  return await loginWithApiKey();
}

/**
 * Fetches active accounts from TopstepX API
 * @param {string} authToken - Authentication token
 * @returns {Promise<Array>} Array of active account objects
 */
async function getActiveAccounts(authToken) {
  const url = `${config.API_ENDPOINT}/api/Account/search`;

  console.log('[AuthService] Fetching active accounts...');

  try {
    const response = await axios.post(
      url,
      { onlyActiveAccounts: true },
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );

    if (response.data && response.data.success && response.data.accounts) {
      console.log(`[AuthService] Found ${response.data.accounts.length} active account(s).`);
      return response.data.accounts;
    }

    console.warn('[AuthService] No accounts found in response');
    return [];
  } catch (error) {
    console.error('[AuthService] Failed to fetch accounts:', error.response ? error.response.data : error.message);
    throw error;
  }
}

/**
 * Clears cached token (useful for logout or error recovery)
 */
function clearToken() {
  currentToken = null;
  tokenExpiryTime = null;
  console.log('[AuthService] Token cleared');
}

module.exports = {
  initialize,
  getAccessToken,
  getActiveAccounts,
  clearToken
};
