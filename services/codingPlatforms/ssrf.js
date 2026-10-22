/**
 * SSRF Guard – validates that a URL points to an allowed external host,
 * not to a private or loopback address.
 */
const dns = require('dns').promises;
const net = require('net');

// Allowed platform hostnames
const ALLOWED_HOSTS = new Set([
  'leetcode.com',
  'www.leetcode.com',
  'hackerrank.com',
  'www.hackerrank.com',
  'codechef.com',
  'www.codechef.com',
]);

/**
 * Returns true if the IPv4/IPv6 address is a private or loopback address.
 */
function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (ip === '0.0.0.0') return true;
  }
  if (net.isIPv6(ip)) {
    if (ip === '::1') return true;
    if (ip.startsWith('fc') || ip.startsWith('fd')) return true;
    if (ip.startsWith('fe80')) return true;
  }
  return false;
}

/**
 * Validates a URL against allowed hosts and checks for SSRF via DNS.
 * @param {string} urlString
 * @returns {Promise<void>} resolves if safe, throws if not
 */
async function guardUrl(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error('Invalid URL');
  }

  const hostname = parsed.hostname.toLowerCase();

  if (!ALLOWED_HOSTS.has(hostname)) {
    throw new Error(`Host ${hostname} is not in the platform allow-list`);
  }

  // DNS resolution check
  try {
    const records = await dns.lookup(hostname, { all: true, family: 0 });
    for (const r of records) {
      if (isPrivateIp(r.address)) {
        throw new Error(`SSRF guard: ${hostname} resolved to a private IP`);
      }
    }
  } catch (err) {
    if (err.message.startsWith('SSRF guard')) throw err;
    // DNS failure – allow through (the actual HTTP call will fail)
  }
}

module.exports = { guardUrl, ALLOWED_HOSTS };
