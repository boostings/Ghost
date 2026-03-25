import type { QuestionResponse } from '../types';

type ParsedQuestionMessage = {
  type?: string;
  question?: QuestionResponse;
  questionId?: string;
};

export function sortQuestionsForFeed(questions: QuestionResponse[]): QuestionResponse[] {
  return [...questions].sort((left, right) => {
    if (left.isPinned !== right.isPinned) {
      return left.isPinned ? -1 : 1;
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

export function parseQuestionMessage(body: string): ParsedQuestionMessage {
  try {
    const parsed: unknown = JSON.parse(body);
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    const envelope = parsed as { type?: unknown; payload?: unknown; id?: unknown };
    const type = typeof envelope.type === 'string' ? envelope.type : undefined;
    const payload = envelope.payload ?? parsed;

    if (payload && typeof payload === 'object') {
      const payloadObject = payload as Record<string, unknown>;
      const payloadId = typeof payloadObject.id === 'string' ? payloadObject.id : undefined;
      const hasQuestionShape =
        typeof payloadObject.title === 'string' &&
        typeof payloadObject.body === 'string' &&
        typeof payloadObject.status === 'string';

      if (hasQuestionShape && payloadId) {
        return { type, question: payloadObject as unknown as QuestionResponse };
      }

      if (payloadId) {
        return { type, questionId: payloadId };
      }
    }

    const rootId = typeof envelope.id === 'string' ? envelope.id : undefined;
    return { type, questionId: rootId };
  } catch {
    return {};
  }
}

export function isQuestionDeleteEvent(type?: string): boolean {
  const normalizedType = type?.toUpperCase() ?? '';
  return normalizedType.includes('DELETE') || normalizedType.includes('REMOVE');
}

export function reconcileQuestionEvent(
  questions: QuestionResponse[],
  messageBody: string
): QuestionResponse[] {
  const { type, question, questionId } = parseQuestionMessage(messageBody);

  if (isQuestionDeleteEvent(type) && questionId) {
    return questions.filter((existing) => existing.id !== questionId);
  }

  if (!question) {
    return questions;
  }

  const existingIndex = questions.findIndex((existing) => existing.id === question.id);
  if (existingIndex >= 0) {
    const next = [...questions];
    next[existingIndex] = question;
    return sortQuestionsForFeed(next);
  }

  return sortQuestionsForFeed([question, ...questions]);
}
