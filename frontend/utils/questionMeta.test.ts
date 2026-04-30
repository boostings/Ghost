import { isQuestionEdited } from './questionMeta';

describe('questionMeta', () => {
  it('uses editedAt as the only edited marker', () => {
    expect(
      isQuestionEdited({
        createdAt: '2026-04-30T12:00:00.000Z',
        updatedAt: '2026-04-30T12:05:00.000Z',
        editedAt: null,
      })
    ).toBe(false);

    expect(
      isQuestionEdited({
        createdAt: '2026-04-30T12:00:00.000Z',
        updatedAt: '2026-04-30T12:05:00.000Z',
        editedAt: '2026-04-30T12:01:00.000Z',
      })
    ).toBe(true);
  });
});
