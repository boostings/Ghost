import { sanitizeForLog } from './api';

describe('api log sanitizer', () => {
  it('redacts token, password, code, secret, and authorization fields recursively', () => {
    const sanitized = sanitizeForLog({
      email: 'student@ilstu.edu',
      code: '123456',
      newPassword: 'Passw0rd',
      confirmPassword: 'Passw0rd',
      accessToken: 'access-token',
      nested: {
        refresh_token: 'refresh-token',
        authorization: 'Bearer access-token',
        inviteCode: 'ABC123',
      },
      list: [{ apiSecret: 'secret-value' }, { page: 1 }],
    });

    expect(sanitized).toEqual({
      email: 'student@ilstu.edu',
      code: '[REDACTED]',
      newPassword: '[REDACTED]',
      confirmPassword: '[REDACTED]',
      accessToken: '[REDACTED]',
      nested: {
        refresh_token: '[REDACTED]',
        authorization: '[REDACTED]',
        inviteCode: '[REDACTED]',
      },
      list: [{ apiSecret: '[REDACTED]' }, { page: 1 }],
    });
  });
});
