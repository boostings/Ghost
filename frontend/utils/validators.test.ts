import {
  getConfirmPasswordError,
  getEmailError,
  getNameError,
  getPasswordError,
  isValidEmail,
  isValidName,
  isValidPassword,
  normalizePassword,
} from './validators';

describe('validators boundary values', () => {
  it.each([
    ['short7', false],
    ['passw0r1', true],
    ['a'.repeat(63) + '1', true],
    ['a'.repeat(127) + '1', true],
    ['a'.repeat(128) + '1', true],
  ])('evaluates password boundary case %s', (password, expected) => {
    expect(isValidPassword(password)).toBe(expected);
  });

  it.each([
    [' ', false],
    ['A', true],
    ['A'.repeat(100), true],
    ['A'.repeat(101), false],
  ])('evaluates name boundary case %#', (name, expected) => {
    expect(isValidName(name)).toBe(expected);
  });

  it('accepts trimmed ilstu emails and rejects malformed local parts', () => {
    expect(isValidEmail('  Student@ILSTU.EDU  ')).toBe(true);
    expect(isValidEmail('student name@ilstu.edu')).toBe(false);
  });

  it('normalizes only trailing password whitespace', () => {
    expect(normalizePassword('testPassword123   ')).toBe('testPassword123');
    expect(normalizePassword(' test Password123   ')).toBe(' test Password123');
  });
});

describe('validators behavior', () => {
  it('accepts only @ilstu.edu email addresses with a local part', () => {
    expect(isValidEmail('student@ilstu.edu')).toBe(true);
    expect(isValidEmail('@ilstu.edu')).toBe(false);
    expect(isValidEmail('student@example.com')).toBe(false);
  });

  it('returns field-specific validation messages for invalid inputs', () => {
    expect(getEmailError('')).toBe('Email is required');
    expect(getEmailError('studentilstu.edu')).toBe('Please enter a valid email address');
    expect(getEmailError('student@example.com')).toBe('Email must be a valid @ilstu.edu address');
    expect(getEmailError('student@ilstu.edu')).toBeNull();
    expect(getNameError('', 'First name')).toBe('First name is required');
    expect(getNameError('Taylor1', 'First name')).toBe('First name can only contain letters');
    expect(getNameError('Taylor', 'First name')).toBeNull();
    expect(getPasswordError('')).toBe('Password is required');
    expect(getPasswordError('short7')).toBe(
      'Password must be at least 8 characters and include a letter and number'
    );
    expect(getPasswordError('passw0rd   ')).toBeNull();
    expect(getConfirmPasswordError('password1', '')).toBe('Please confirm your password');
    expect(getConfirmPasswordError('password1', 'password2')).toBe('Passwords do not match');
    expect(getConfirmPasswordError('password1   ', 'password1')).toBeNull();
  });
});
