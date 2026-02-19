/**
 * Formats an ISO date string into a human-readable relative time string.
 *
 * Returns:
 * - "Just now" for less than 1 minute ago
 * - "Xm ago" for less than 1 hour ago
 * - "Xh ago" for less than 24 hours ago
 * - "Xd ago" for less than 7 days ago
 * - "Jan 15" for the same year
 * - "Jan 15, 2025" for a different year
 */
export function formatDate(date?: string | null): string {
  if (!date) {
    return 'Just now';
  }

  const now = new Date();
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return 'Just now';
  }
  const diffMs = now.getTime() - parsed.getTime();

  if (diffMs < 0) {
    return 'Just now';
  }

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) {
    return 'Just now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  const month = months[parsed.getMonth()];
  const day = parsed.getDate();

  if (parsed.getFullYear() === now.getFullYear()) {
    return `${month} ${day}`;
  }

  return `${month} ${day}, ${parsed.getFullYear()}`;
}

/**
 * Formats an ISO date string into a full human-readable date string.
 *
 * Returns: "January 15, 2026 at 3:45 PM"
 */
export function formatFullDate(date?: string | null): string {
  if (!date) {
    return 'Unknown date';
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown date';
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const month = months[parsed.getMonth()];
  const day = parsed.getDate();
  const year = parsed.getFullYear();

  let hours = parsed.getHours();
  const minutes = parsed.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  if (hours === 0) {
    hours = 12;
  }

  const minuteStr = minutes < 10 ? `0${minutes}` : `${minutes}`;

  return `${month} ${day}, ${year} at ${hours}:${minuteStr} ${ampm}`;
}
