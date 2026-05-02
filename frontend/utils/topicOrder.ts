import type { TopicResponse } from '../types';

export const DEFAULT_TOPIC_ORDER = ['Homework', 'Exam', 'Lecture', 'General'];

export function sortTopics<T extends Pick<TopicResponse, 'name'>>(topics: T[]): T[] {
  return [...topics].sort((a, b) => {
    const aIndex = DEFAULT_TOPIC_ORDER.indexOf(a.name);
    const bIndex = DEFAULT_TOPIC_ORDER.indexOf(b.name);
    if (aIndex !== -1 || bIndex !== -1) {
      return (
        (aIndex === -1 ? DEFAULT_TOPIC_ORDER.length : aIndex) -
        (bIndex === -1 ? DEFAULT_TOPIC_ORDER.length : bIndex)
      );
    }
    return a.name.localeCompare(b.name);
  });
}
