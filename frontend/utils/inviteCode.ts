const INVITE_CODE_REGEX = /^[A-Za-z0-9]{4,20}$/;

/**
 * Extracts an invite code from raw scanner/deep-link text.
 * Supports:
 * - raw code (e.g., ABCD1234)
 * - ghost://join/ABCD1234
 * - https://.../join/ABCD1234
 */
export function parseInviteCode(rawValue: string): string | null {
  if (!rawValue) {
    return null;
  }

  const trimmed = rawValue.trim();
  if (!trimmed) {
    return null;
  }

  if (INVITE_CODE_REGEX.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  const match = trimmed.match(/\/join\/([A-Za-z0-9]+)/i);
  if (match && match[1]) {
    const code = match[1].trim();
    if (INVITE_CODE_REGEX.test(code)) {
      return code.toUpperCase();
    }
  }

  const deepLinkMatch = trimmed.match(/^ghost:\/\/join\/([A-Za-z0-9]+)$/i);
  if (deepLinkMatch && deepLinkMatch[1]) {
    const code = deepLinkMatch[1].trim();
    if (INVITE_CODE_REGEX.test(code)) {
      return code.toUpperCase();
    }
  }

  return null;
}
