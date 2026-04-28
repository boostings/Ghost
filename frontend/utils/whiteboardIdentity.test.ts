import {
  dedupeWhiteboards,
  findMatchingWhiteboard,
  normalizeWhiteboardIdentity,
} from './whiteboardIdentity';
import type { WhiteboardResponse } from '../types';

function makeWhiteboard(overrides: Partial<WhiteboardResponse> = {}): WhiteboardResponse {
  return {
    id: overrides.id ?? 'wb-1',
    courseCode: overrides.courseCode ?? 'IT326',
    courseName: overrides.courseName ?? 'Software Engineering',
    section: overrides.section ?? '001',
    semester: overrides.semester ?? 'Fall 2026',
    ownerId: overrides.ownerId ?? 'owner-1',
    ownerName: overrides.ownerName ?? 'Faculty One',
    inviteCode: overrides.inviteCode ?? 'JOINME',
    isDemo: overrides.isDemo ?? false,
    memberCount: overrides.memberCount ?? 1,
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
  };
}

describe('whiteboardIdentity', () => {
  it('normalizes course code and semester for duplicate checks', () => {
    expect(
      normalizeWhiteboardIdentity({
        courseCode: ' acc 131 ',
        semester: ' fall   2026 ',
        section: ' 001 ',
      })
    ).toBe('ACC131::FALL 2026::001');
  });

  it('finds existing whiteboards by course code, semester, and section', () => {
    const existing = makeWhiteboard({ section: '001' });

    expect(
      findMatchingWhiteboard([existing], {
        courseCode: 'it326',
        semester: 'Fall 2026',
        section: '001',
      })
    ).toEqual(existing);
    expect(
      findMatchingWhiteboard([existing], {
        courseCode: 'it326',
        semester: 'Fall 2026',
        section: '002',
      })
    ).toBeUndefined();
  });

  it('deduplicates repeated ids and repeated class sections', () => {
    const first = makeWhiteboard({ id: 'wb-1', section: '001' });
    const sameId = makeWhiteboard({ id: 'wb-1', section: '002' });
    const sameClassSection = makeWhiteboard({ id: 'wb-2', section: '001' });
    const otherSection = makeWhiteboard({ id: 'wb-3', section: '003' });
    const otherClass = makeWhiteboard({ id: 'wb-4', courseCode: 'ACC131' });

    expect(dedupeWhiteboards([first, sameId, sameClassSection, otherSection, otherClass])).toEqual([
      first,
      otherSection,
      otherClass,
    ]);
  });
});
