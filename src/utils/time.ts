/**
 * Time formatting utilities
 */

/**
 * Format seconds as MM:SS
 * @param sec - Total seconds
 * @returns Formatted time string (e.g., "05:30")
 */
export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
