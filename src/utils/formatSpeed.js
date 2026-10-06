import { formatBytes } from './formatBytes.js';

/**
 * Formats transfer speed (bytes per second)
 * @param {number} bytesPerSecond
 * @returns {string} e.g. "18.4 MB/s"
 */
export function formatSpeed(bytesPerSecond) {
  if (!bytesPerSecond || bytesPerSecond <= 0) return '0 B/s';
  return `${formatBytes(bytesPerSecond, 1)}/s`;
}

/**
 * Calculates and formats estimated time remaining
 * @param {number} bytesRemaining
 * @param {number} bytesPerSecond
 * @returns {string} e.g. "14s", "2m 10s"
 */
export function formatETA(bytesRemaining, bytesPerSecond) {
  if (!bytesPerSecond || bytesPerSecond <= 0 || !bytesRemaining || bytesRemaining <= 0) {
    return 'Calculating...';
  }

  const seconds = Math.ceil(bytesRemaining / bytesPerSecond);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remSec = seconds % 60;
  return `${minutes}m ${remSec}s`;
}
