import { formatTimestamp, formatTimestampLong } from './formatTimestamp';

describe('formatTimestamp', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-01T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns a safe fallback for invalid values', () => {
    expect(formatTimestamp('invalid-date')).toBe('just now');
  });

  it('formats recent dates relatively', () => {
    expect(formatTimestamp('2026-04-30T12:00:00.000Z')).toBe('1 day ago');
  });

  it('formats same-year older dates without the year', () => {
    expect(formatTimestamp('2026-04-01T12:00:00.000Z')).toBe('Apr 1');
  });

  it('includes the year for older dates', () => {
    expect(formatTimestamp('2025-04-01T12:00:00.000Z')).toBe('Apr 1, 2025');
  });
});

describe('formatTimestampLong', () => {
  it('returns unknown date for invalid values', () => {
    expect(formatTimestampLong('bad-value')).toBe('Unknown date');
  });

  it('formats a valid date with year and time', () => {
    const output = formatTimestampLong('2026-01-15T15:45:00.000Z');
    expect(output).toContain('2026');
    expect(output).toContain(':');
  });
});
