import { smartTitleCase } from './titleCase';

describe('smartTitleCase', () => {
  it('keeps small words lowercase in the middle of course names', () => {
    expect(smartTitleCase('Principles Of Software Engineering')).toBe(
      'Principles of Software Engineering'
    );
    expect(smartTitleCase('Cost And Management Accounting')).toBe(
      'Cost and Management Accounting'
    );
  });

  it('capitalizes small words at course name boundaries', () => {
    expect(smartTitleCase('the art of computing')).toBe('The Art of Computing');
    expect(smartTitleCase('intro to')).toBe('Intro To');
  });

  it('preserves spacing and hyphen separators', () => {
    expect(smartTitleCase('data-driven systems')).toBe('Data-Driven Systems');
  });
});
