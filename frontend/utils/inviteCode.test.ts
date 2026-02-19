import { parseInviteCode } from './inviteCode';

describe('parseInviteCode', () => {
  it('parses raw codes', () => {
    expect(parseInviteCode('abcd1234')).toBe('ABCD1234');
  });

  it('parses deep links and web links', () => {
    expect(parseInviteCode('ghost://join/it326f26')).toBe('IT326F26');
    expect(parseInviteCode('https://ghost.app/join/it326f26')).toBe('IT326F26');
  });

  it('returns null for invalid payloads', () => {
    expect(parseInviteCode('')).toBeNull();
    expect(parseInviteCode('not-a-code!')).toBeNull();
  });
});
