type QuestionDeletedEvent = {
  whiteboardId: string;
  questionId: string;
};

type QuestionDeletedListener = (event: QuestionDeletedEvent) => void;

const listeners = new Set<QuestionDeletedListener>();

export function notifyQuestionDeleted(event: QuestionDeletedEvent): void {
  listeners.forEach((listener) => listener(event));
}

export function subscribeToQuestionDeleted(listener: QuestionDeletedListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
