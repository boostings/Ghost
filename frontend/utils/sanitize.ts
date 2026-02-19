const CONTROL_CHARS_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function sanitizeText(value: string): string {
  return value.replace(CONTROL_CHARS_REGEX, '').trim();
}

export function sanitizeSingleLine(value: string): string {
  return sanitizeText(value).replace(/\s+/g, ' ');
}
