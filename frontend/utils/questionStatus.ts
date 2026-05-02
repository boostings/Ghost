import type { DisplayQuestionStatus } from '../constants/colors';
import type { QuestionResponse } from '../types';

export function getQuestionDisplayStatus(
  question: Pick<QuestionResponse, 'status' | 'verifiedAnswerId'>
): DisplayQuestionStatus {
  if (question.verifiedAnswerId) return 'ANSWERED';
  return question.status === 'OPEN' ? 'OPEN' : 'CLOSED';
}
