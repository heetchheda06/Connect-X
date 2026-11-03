/**
 * High-accuracy best-effort Redaction Engine for ConnectX (Section 6.4)
 * Sanitizes sensitive identifiers, financial information, credentials and contact data
 * before sending message payloads to third-party AI services.
 */

// Simple Luhn check for credit card verification
function passesLuhn(cardNumberStr) {
  const digits = cardNumberStr.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

export class RedactionService {
  /**
   * Redact sensitive tokens from message text
   * @param {string} text Raw text
   * @returns {string} Redacted text with standardized privacy placeholders
   */
  redact(text) {
    if (!text || typeof text !== 'string') return '';

    let redacted = text;

    // 1. Passwords, bearer tokens and API keys
    redacted = redacted.replace(
      /(?:password|passwd|api[_-]?key|secret[_-]?key|access[_-]?token|bearer)[:\s=]+([^\s,;]+)/gi,
      (match, val) => match.replace(val, '[SECRET]')
    );

    // 2. Sensitive URLs with security tokens or query keys
    redacted = redacted.replace(
      /https?:\/\/[^\s]+[?&](?:token|auth|key|secret|session)=[^\s&]+/gi,
      '[LINK]'
    );

    // 3. Email addresses
    redacted = redacted.replace(
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
      '[EMAIL]'
    );

    // 4. UPI IDs (e.g. user@okhdfcbank, payments@paytm, user@upi, user@ybl)
    redacted = redacted.replace(
      /\b[a-zA-Z0-9.\-_]{2,256}@(okaxis|okhdfcbank|okicici|oksbi|paytm|ybl|axl|ibl|upi|postbank|jupiteraxis)\b/gi,
      '[BANK]'
    );

    // 5. Indian IFSC Codes (4 letters + 0 + 6 alphanumeric, e.g. HDFC0001234, SBIN0000456)
    redacted = redacted.replace(
      /\b[A-Z]{4}0[A-Z0-9]{6}\b/g,
      '[BANK]'
    );

    // 6. Bank account numbers following "acc", "account", "a/c"
    redacted = redacted.replace(
      /(?:account|a\/c|acc[.\s]?no[:\s]*)\s*(\d{9,18})\b/gi,
      (match, acct) => match.replace(acct, '[BANK]')
    );

    // 7. Aadhaar numbers (12 digits, spaced or hyphenated, e.g. 1234 5678 9012 or 1234-5678-9012)
    redacted = redacted.replace(
      /\b[2-9]\d{3}[-\s]\d{4}[-\s]\d{4}\b/g,
      '[ID]'
    );

    // 8. Indian PAN Cards (5 letters + 4 digits + 1 letter, e.g. ABCDE1234F)
    redacted = redacted.replace(
      /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g,
      '[ID]'
    );

    // 9. Credit / Debit card numbers (13-19 digits, spaced, hyphenated or solid)
    redacted = redacted.replace(
      /\b(?:\d{4}[-\s]?){3}\d{1,4}\b/g,
      (match) => {
        if (passesLuhn(match)) {
          return '[CARD]';
        }
        return match;
      }
    );

    // 10. OTP / Verification codes near keywords
    redacted = redacted.replace(
      /(?:otp|verification\s*code|pin|security\s*code)[:\s]+(\d{4,8})\b/gi,
      (match, code) => match.replace(code, '[CODE]')
    );

    // 11. Phone numbers (+91, standard 10-digit mobiles, international prefix)
    redacted = redacted.replace(
      /(?:\+91[\s-]?)?[6-9]\d{9}\b/g,
      '[PHONE]'
    );
    redacted = redacted.replace(
      /(?:\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g,
      '[PHONE]'
    );

    return redacted;
  }
}

export const redactionService = new RedactionService();
export default redactionService;
