import type { WhiteboardResponse } from '../types';

type WhiteboardIdentityInput = {
  courseCode: string;
  semester: string;
  section?: string | null;
};

export function normalizeWhiteboardIdentity(input: WhiteboardIdentityInput): string {
  const courseCode = input.courseCode.trim().replace(/\s+/g, '').toUpperCase();
  const semester = input.semester.trim().replace(/\s+/g, ' ').toUpperCase();
  const section = input.section?.trim().replace(/\s+/g, '').toUpperCase() || 'NO_SECTION';
  return `${courseCode}::${semester}::${section}`;
}

export function findMatchingWhiteboard(
  whiteboards: WhiteboardResponse[],
  input: WhiteboardIdentityInput
): WhiteboardResponse | undefined {
  const identity = normalizeWhiteboardIdentity(input);
  return whiteboards.find((whiteboard) => normalizeWhiteboardIdentity(whiteboard) === identity);
}

export function dedupeWhiteboards(whiteboards: WhiteboardResponse[]): WhiteboardResponse[] {
  const seenIds = new Set<string>();
  const seenClasses = new Set<string>();
  const result: WhiteboardResponse[] = [];

  for (const whiteboard of whiteboards) {
    const classIdentity = normalizeWhiteboardIdentity(whiteboard);
    if (seenIds.has(whiteboard.id) || seenClasses.has(classIdentity)) {
      continue;
    }
    seenIds.add(whiteboard.id);
    seenClasses.add(classIdentity);
    result.push(whiteboard);
  }

  return result;
}
