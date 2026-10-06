/**
 * Encryption Service for Application-Level Signaling & File Security
 * 
 * NOTE ON SECURITY ARCHITECTURE:
 * 1. WebRTC natively uses DTLS (Datagram Transport Layer Security) to encrypt all
 *    DataChannel traffic in-transit between browsers.
 * 2. In addition to WebRTC DTLS, this module implements application-level AES-256-GCM
 *    encryption using the Web Crypto API (crypto.subtle) for both signaling messages
 *    and optional file chunk payload encryption.
 * 3. Note: Web Crypto API (crypto.subtle) is available in Secure Contexts (HTTPS, localhost, 127.0.0.1).
 *    If accessed via unsecure HTTP IP addresses (e.g. http://192.168.x.x:5180), a transparent fallback
 *    is used while WebRTC DTLS continues to secure all P2P file data.
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

function getSubtleCrypto() {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    return window.crypto.subtle;
  }
  return null;
}

/**
 * Generates a random 256-bit AES-GCM key or fallback key if subtle crypto is unsecure
 * @returns {Promise<{ key: CryptoKey|object, hexKey: string }>}
 */
export async function generateSessionKey() {
  const subtle = getSubtleCrypto();

  if (subtle) {
    const key = await subtle.generateKey(
      { name: ALGORITHM, length: KEY_LENGTH },
      true, // extractable
      ['encrypt', 'decrypt']
    );

    const exported = await subtle.exportKey('raw', key);
    const hexKey = Array.from(new Uint8Array(exported))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return { key, hexKey };
  } else {
    // Fallback for non-secure HTTP contexts (e.g., http://192.168.x.x)
    const bytes = new Uint8Array(32);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < 32; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    const hexKey = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return { key: { isFallback: true, hexKey }, hexKey };
  }
}

/**
 * Imports a raw hex key string back into a CryptoKey object or fallback container
 * @param {string} hexKey
 * @returns {Promise<CryptoKey|object>}
 */
export async function importKeyFromHex(hexKey) {
  const subtle = getSubtleCrypto();

  if (subtle) {
    const bytes = new Uint8Array(
      hexKey.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
    );

    return await subtle.importKey(
      'raw',
      bytes,
      { name: ALGORITHM },
      false,
      ['encrypt', 'decrypt']
    );
  } else {
    return { isFallback: true, hexKey };
  }
}

/**
 * Encrypts a JS object signaling payload into a JSON-safe container
 * @param {object} payload
 * @param {CryptoKey|object} key
 * @returns {Promise<{ iv: string, ciphertext: string, isPlain?: boolean }>}
 */
export async function encryptPayload(payload, key) {
  const subtle = getSubtleCrypto();

  if (subtle && key && !key.isFallback) {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(payload));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encryptedBuffer = await subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      data
    );

    return {
      iv: arrayBufferToBase64(iv.buffer),
      ciphertext: arrayBufferToBase64(encryptedBuffer)
    };
  } else {
    // Fallback pass-through container for unsecure HTTP context
    const jsonString = JSON.stringify(payload);
    return {
      iv: 'fallback',
      ciphertext: window.btoa(encodeURIComponent(jsonString)),
      isPlain: true
    };
  }
}

/**
 * Decrypts an encrypted signaling payload container back into a JS object
 * @param {{ iv: string, ciphertext: string, isPlain?: boolean }} envelope
 * @param {CryptoKey|object} key
 * @returns {Promise<object>}
 */
export async function decryptPayload(envelope, key) {
  if (envelope.isPlain || envelope.iv === 'fallback') {
    const jsonString = decodeURIComponent(window.atob(envelope.ciphertext));
    return JSON.parse(jsonString);
  }

  const subtle = getSubtleCrypto();
  if (subtle && key && !key.isFallback) {
    const iv = new Uint8Array(base64ToArrayBuffer(envelope.iv));
    const ciphertext = base64ToArrayBuffer(envelope.ciphertext);

    const decryptedBuffer = await subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decryptedBuffer);
    return JSON.parse(jsonString);
  }

  throw new Error('Web Crypto API unavailable to decrypt payload');
}

/**
 * Encrypts a binary ArrayBuffer file chunk using AES-GCM
 * @param {ArrayBuffer} chunkBuffer
 * @param {CryptoKey|object} key
 * @param {number} chunkIndex
 * @returns {Promise<ArrayBuffer>}
 */
export async function encryptChunk(chunkBuffer, key, chunkIndex) {
  const subtle = getSubtleCrypto();

  if (subtle && key && !key.isFallback) {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ciphertextBuffer = await subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      chunkBuffer
    );

    const result = new Uint8Array(12 + ciphertextBuffer.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(ciphertextBuffer), 12);
    return result.buffer;
  }

  // Fallback pass-through if Web Crypto API is unavailable
  return chunkBuffer;
}

/**
 * Decrypts an encrypted binary file chunk
 * @param {ArrayBuffer} encryptedChunkBuffer
 * @param {CryptoKey|object} key
 * @returns {Promise<ArrayBuffer>}
 */
export async function decryptChunk(encryptedChunkBuffer, key) {
  const subtle = getSubtleCrypto();

  if (subtle && key && !key.isFallback) {
    const iv = new Uint8Array(encryptedChunkBuffer.slice(0, 12));
    const ciphertext = encryptedChunkBuffer.slice(12);

    return await subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      ciphertext
    );
  }

  return encryptedChunkBuffer;
}

// Helpers for Base64 conversion
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
