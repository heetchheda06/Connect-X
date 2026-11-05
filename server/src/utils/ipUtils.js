/**
 * Truncates an IP address for privacy compliance (IPv4 /24 or IPv6 /48).
 * Ensures full raw IPs are never stored permanently in session records.
 *
 * @param {string} ip - Raw IP address
 * @returns {string} Truncated IP
 */
export function truncateIp(ip) {
  if (!ip || typeof ip !== 'string') return 'Unknown';

  // Normalize localhost and IPv6-mapped IPv4
  let cleanIp = ip.trim();
  if (cleanIp === '::1' || cleanIp === '127.0.0.1' || cleanIp === '::ffff:127.0.0.1') {
    return '127.0.0.0/24 (Localhost)';
  }

  if (cleanIp.startsWith('::ffff:')) {
    cleanIp = cleanIp.replace('::ffff:', '');
  }

  // IPv4 check: e.g. 192.168.1.150 -> 192.168.1.0/24
  if (cleanIp.includes('.')) {
    const parts = cleanIp.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
    }
  }

  // IPv6 check: e.g. 2001:db8:85a3:8d3:1319:8a2e:370:7348 -> 2001:db8:85a3::/48
  if (cleanIp.includes(':')) {
    const hextets = cleanIp.split(':');
    if (hextets.length >= 3) {
      return `${hextets[0]}:${hextets[1]}:${hextets[2]}::/48`;
    }
  }

  return cleanIp;
}

export default truncateIp;

