import { getQuestionDisplayStatus } from './questionStatus';

describe('getQuestionDisplayStatus', () => {
  it('uses answered for questions with a verified answer', () => {
    expect(getQuestionDisplayStatus({ status: 'CLOSED', verifiedAnswerId: 'comment-1' })).toBe(
      'ANSWERED'
    );
  });

  it('keeps open and closed statuses without a verified answer', () => {
    expect(getQuestionDisplayStatus({ status: 'OPEN', verifiedAnswerId: null })).toBe('OPEN');
    expect(getQuestionDisplayStatus({ status: 'CLOSED', verifiedAnswerId: null })).toBe('CLOSED');
  });
});
