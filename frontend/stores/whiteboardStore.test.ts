import { useWhiteboardStore } from './whiteboardStore';
import type { WhiteboardResponse } from '../types';

function makeWhiteboard(id: string, name = 'Data Structures'): WhiteboardResponse {
  return {
    id,
    courseCode: 'IT326',
    courseName: name,
    section: '001',
    semester: 'Fall 2026',
    ownerId: 'owner-1',
    ownerName: 'Faculty One',
    inviteCode: 'ABC1234',
    isDemo: false,
    memberCount: 10,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('whiteboardStore', () => {
  beforeEach(() => {
    useWhiteboardStore.getState().reset();
  });

  it('sets whiteboards and clears loading', () => {
    const store = useWhiteboardStore.getState();
    store.setLoading(true);
    store.setWhiteboards([makeWhiteboard('wb-1')]);

    const next = useWhiteboardStore.getState();
    expect(next.whiteboards).toHaveLength(1);
    expect(next.isLoading).toBe(false);
  });

  it('deduplicates repeated whiteboards by id and class identity', () => {
    const first = makeWhiteboard('wb-1', 'Data Structures');
    const sameId = { ...first, section: '002' };
    const sameClass = makeWhiteboard('wb-2', 'Data Structures');
    const otherClass = {
      ...makeWhiteboard('wb-3', 'Accounting'),
      courseCode: 'ACC131',
    };

    useWhiteboardStore.getState().setWhiteboards([first, sameId, sameClass, otherClass]);
    useWhiteboardStore.getState().addWhiteboard(sameClass);

    expect(useWhiteboardStore.getState().whiteboards).toEqual([first, otherClass]);
  });

  it('adds, updates, and removes whiteboards', () => {
    const first = makeWhiteboard('wb-1', 'Data Structures');
    const updated = { ...first, courseName: 'Advanced Data Structures' };

    useWhiteboardStore.getState().addWhiteboard(first);
    useWhiteboardStore.getState().setCurrentWhiteboard(first);
    useWhiteboardStore.getState().updateWhiteboard(updated);
    useWhiteboardStore.getState().removeWhiteboard('wb-1');

    const next = useWhiteboardStore.getState();
    expect(next.whiteboards).toHaveLength(0);
    expect(next.currentWhiteboard).toBeNull();
  });

  it('preserves the current selection when other whiteboards change', () => {
    const first = makeWhiteboard('wb-1', 'Data Structures');
    const second = makeWhiteboard('wb-2', 'Algorithms');
    const updatedSecond = { ...second, courseName: 'Advanced Algorithms' };

    useWhiteboardStore.getState().setWhiteboards([first, second]);
    useWhiteboardStore.getState().setCurrentWhiteboard(first);
    useWhiteboardStore.getState().updateWhiteboard(updatedSecond);
    useWhiteboardStore.getState().removeWhiteboard('wb-2');

    const next = useWhiteboardStore.getState();
    expect(next.currentWhiteboard).toEqual(first);
    expect(next.whiteboards).toEqual([first]);
  });
});
