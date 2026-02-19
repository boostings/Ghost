import { formatDate, formatFullDate } from './formatDate';

describe('formatDate', () => {
  it('returns a safe fallback for null and invalid values', () => {
    expect(formatDate(null)).toBe('Just now');
    expect(formatDate(undefined)).toBe('Just now');
    expect(formatDate('invalid-date')).toBe('Just now');
  });

  it('includes the year for old dates', () => {
    expect(formatDate('2000-01-01T00:00:00.000Z')).toMatch(/,\s\d{4}$/);
  });
});

describe('formatFullDate', () => {
  it('returns unknown date for invalid values', () => {
    expect(formatFullDate(null)).toBe('Unknown date');
    expect(formatFullDate('bad-value')).toBe('Unknown date');
  });

  it('formats a valid date with year and time', () => {
    const output = formatFullDate('2026-01-15T15:45:00.000Z');
    expect(output).toContain('2026');
    expect(output).toContain(':');
  });
});
