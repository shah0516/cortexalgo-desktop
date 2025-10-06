// services/securityService.js
// Security utilities for device fingerprinting, request signing, and rate limiting

const { machineIdSync } = require('node-machine-id');
const crypto = require('crypto');
const os = require('os');

/**
 * Generate unique device fingerprint
 * Combines machine ID with platform info for unique identifier
 * @returns {string} Device fingerprint hash
 */
function getDeviceFingerprint() {
  try {
    const machineId = machineIdSync({ original: true });
    const platform = os.platform();
    const arch = os.arch();
    const hostname = os.hostname();
    const cpus = os.cpus().length;

    const fingerprintData = `${machineId}-${platform}-${arch}-${hostname}-${cpus}`;

    return crypto
      .createHash('sha256')
      .update(fingerprintData)
      .digest('hex');
  } catch (error) {
    console.error('[Security] Failed to generate device fingerprint:', error);
    // Fallback to platform-only fingerprint
    return crypto
      .createHash('sha256')
      .update(`${os.platform()}-${os.arch()}-${os.hostname()}`)
      .digest('hex');
  }
}

/**
 * Sign a request with HMAC-SHA256
 * Prevents tampering and replay attacks
 * @param {Object} data - Request payload
 * @param {string} accessToken - JWT access token (used as HMAC key)
 * @returns {Object} Signed request with signature, timestamp, and nonce
 */
function signRequest(data, accessToken) {
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(16).toString('hex');

  // Create payload with timestamp and nonce
  const payload = {
    ...data,
    timestamp,
    nonce
  };

  // Create HMAC signature
  const payloadString = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', accessToken)
    .update(payloadString)
    .digest('hex');

  return {
    payload,
    signature,
    timestamp,
    nonce
  };
}

/**
 * Rate limiter class to prevent API abuse
 * Tracks requests within a time window
 */
class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  /**
   * Check if request is within rate limit
   * @throws {Error} If rate limit exceeded
   */
  checkLimit() {
    const now = Date.now();

    // Remove old requests outside the window
    this.requests = this.requests.filter(timestamp => {
      return (now - timestamp) < this.windowMs;
    });

    // Check if limit exceeded
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const resetTime = oldestRequest + this.windowMs;
      const secondsUntilReset = Math.ceil((resetTime - now) / 1000);

      throw new Error(`Rate limit exceeded. Try again in ${secondsUntilReset} seconds.`);
    }

    // Add current request
    this.requests.push(now);
  }

  /**
   * Get current usage stats
   * @returns {Object} Usage statistics
   */
  getStats() {
    const now = Date.now();
    this.requests = this.requests.filter(t => (now - t) < this.windowMs);

    return {
      used: this.requests.length,
      limit: this.maxRequests,
      remaining: this.maxRequests - this.requests.length,
      resetIn: this.requests.length > 0
        ? Math.ceil((Math.min(...this.requests) + this.windowMs - now) / 1000)
        : 0
    };
  }
}

/**
 * Get certificate fingerprint from a TLS socket
 * Used for certificate pinning
 * @param {tls.TLSSocket} socket - TLS socket
 * @returns {string} Certificate fingerprint (sha256)
 */
function getCertificateFingerprint(socket) {
  const cert = socket.getPeerCertificate();
  if (!cert || !cert.raw) {
    throw new Error('No certificate available');
  }

  return crypto
    .createHash('sha256')
    .update(cert.raw)
    .digest('base64');
}

module.exports = {
  getDeviceFingerprint,
  signRequest,
  RateLimiter,
  getCertificateFingerprint
};
