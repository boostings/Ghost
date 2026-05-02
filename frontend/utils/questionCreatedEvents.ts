import type { QuestionResponse } from '../types';

type QuestionCreatedEvent = { whiteboardId: string; question: QuestionResponse };
type QuestionCreatedListener = (event: QuestionCreatedEvent) => void;

const listeners = new Set<QuestionCreatedListener>();

export function notifyQuestionCreated(event: QuestionCreatedEvent): void {
  listeners.forEach((listener) => listener(event));
}

export function subscribeToQuestionCreated(listener: QuestionCreatedListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
