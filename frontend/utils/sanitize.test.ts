import { sanitizeSingleLine, sanitizeText } from './sanitize';

describe('sanitizeText', () => {
  it('removes control characters and trims input', () => {
    expect(sanitizeText('  hello\u0007 world  ')).toBe('hello world');
  });
});

describe('sanitizeSingleLine', () => {
  it('collapses whitespace to a single line', () => {
    expect(sanitizeSingleLine('  hello   \n  world\t\tagain ')).toBe('hello world again');
  });
});
