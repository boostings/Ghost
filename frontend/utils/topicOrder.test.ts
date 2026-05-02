import { sortTopics } from './topicOrder';

describe('sortTopics', () => {
  it('uses the canonical default topic order first', () => {
    const topics = [
      { name: 'General' },
      { name: 'Lecture' },
      { name: 'Homework' },
      { name: 'Exam' },
      { name: 'Project' },
    ];

    expect(sortTopics(topics).map((topic) => topic.name)).toEqual([
      'Homework',
      'Exam',
      'Lecture',
      'General',
      'Project',
    ]);
  });
});
