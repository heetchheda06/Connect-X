import { UAParser } from 'ua-parser-js';

/**
 * Parses user-agent string into a clean, human-readable device and browser label.
 * Example outputs: "Chrome on Windows 11", "Mobile Safari on iPhone", "Firefox on macOS"
 *
 * @param {string} userAgent
 * @returns {string} Human-friendly device label
 */
export function parseDeviceLabel(userAgent) {
  if (!userAgent || typeof userAgent !== 'string') {
    return 'Unknown Device';
  }

  try {
    const parser = new UAParser(userAgent);
    const browser = parser.getBrowser();
    const os = parser.getOS();
    const device = parser.getDevice();

    const browserName = browser.name || 'Web Browser';
    const osName = os.name ? `${os.name}${os.version ? ` ${os.version}` : ''}` : '';
    const deviceModel = device.model || device.vendor || '';

    if (device.type === 'mobile' || device.type === 'tablet') {
      if (deviceModel && osName) {
        return `${browserName} on ${deviceModel} (${osName})`;
      }
      if (osName) {
        return `${browserName} on ${osName} (Mobile)`;
      }
      return `${browserName} (Mobile)`;
    }

    if (osName) {
      return `${browserName} on ${osName}`;
    }

    return browserName;
  } catch (err) {
    return 'Web Browser';
  }
}

export default parseDeviceLabel;

