const CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Generates a random session ID in format: K8F4-X92P
 * Works in both Node.js and Browser environments.
 * @returns {string} Session ID
 */
export function generateSessionId() {
  const bytes = new Uint8Array(8);
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 8; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  let id1 = '';
  let id2 = '';

  for (let i = 0; i < 4; i++) {
    id1 += CHARS[bytes[i] % CHARS.length];
    id2 += CHARS[bytes[i + 4] % CHARS.length];
  }

  return `${id1}-${id2}`;
}

/**
 * Validates session ID format (4 chars - 4 chars)
 * @param {string} sessionId
 * @returns {boolean}
 */
export function isValidSessionId(sessionId) {
  if (!sessionId || typeof sessionId !== 'string') return false;
  const regex = /^[2-9A-Z]{4}-[2-9A-Z]{4}$/i;
  return regex.test(sessionId.trim());
}
