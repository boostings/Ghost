/**
 * Validates that an email address ends with @ilstu.edu.
 *
 * @param email - The email address to validate.
 * @returns true if the email is a valid @ilstu.edu address.
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const trimmed = email.trim().toLowerCase();

  // Must end with @ilstu.edu
  if (!trimmed.endsWith('@ilstu.edu')) {
    return false;
  }

  // Must have a local part before the @
  const localPart = trimmed.slice(0, trimmed.indexOf('@'));
  if (localPart.length === 0) {
    return false;
  }

  // Basic email format check: local part should have valid characters
  const emailRegex = /^[a-zA-Z0-9._%+-]+@ilstu\.edu$/i;
  return emailRegex.test(trimmed);
}

/**
 * Validates that a name contains only letters, spaces, hyphens, and apostrophes.
 * Must be at least 1 character and at most 100 characters.
 *
 * @param name - The name to validate.
 * @returns true if the name is valid.
 */
export function isValidName(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }

  const trimmed = name.trim();

  if (trimmed.length === 0 || trimmed.length > 100) {
    return false;
  }

  // Letters (including accented), spaces, hyphens, and apostrophes
  const nameRegex = /^[a-zA-Z\u00C0-\u024F\s'-]+$/;
  return nameRegex.test(trimmed);
}

/**
 * Validates that a password is at least 8 characters long.
 *
 * @param password - The password to validate.
 * @returns true if the password meets the minimum length requirement.
 */
export function isValidPassword(password: string): boolean {
  if (!password || typeof password !== 'string') {
    return false;
  }

  return password.length >= 8;
}

/**
 * Returns a validation error message for an email, or null if valid.
 */
export function getEmailError(email: string): string | null {
  if (!email || email.trim().length === 0) {
    return 'Email is required';
  }

  if (!email.includes('@')) {
    return 'Please enter a valid email address';
  }

  if (!isValidEmail(email)) {
    return 'Email must be a valid @ilstu.edu address';
  }

  return null;
}

/**
 * Returns a validation error message for a name, or null if valid.
 */
export function getNameError(name: string, fieldName: string = 'Name'): string | null {
  if (!name || name.trim().length === 0) {
    return `${fieldName} is required`;
  }

  if (!isValidName(name)) {
    return `${fieldName} can only contain letters, spaces, and hyphens`;
  }

  return null;
}

/**
 * Returns a validation error message for a password, or null if valid.
 */
export function getPasswordError(password: string): string | null {
  if (!password || password.length === 0) {
    return 'Password is required';
  }

  if (!isValidPassword(password)) {
    return 'Password must be at least 8 characters';
  }

  return null;
}

/**
 * Returns a validation error message for password confirmation, or null if valid.
 */
export function getConfirmPasswordError(password: string, confirmPassword: string): string | null {
  if (!confirmPassword || confirmPassword.length === 0) {
    return 'Please confirm your password';
  }

  if (password !== confirmPassword) {
    return 'Passwords do not match';
  }

  return null;
}
