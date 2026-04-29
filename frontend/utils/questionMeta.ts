type QuestionEditMeta = {
  editedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export function isQuestionEdited(question?: QuestionEditMeta | null): boolean {
  if (!question) {
    return false;
  }

  if (question.editedAt) {
    return true;
  }

  if (!question.createdAt || !question.updatedAt) {
    return false;
  }

  const createdAt = new Date(question.createdAt).getTime();
  const updatedAt = new Date(question.updatedAt).getTime();

  if (Number.isNaN(createdAt) || Number.isNaN(updatedAt)) {
    return false;
  }

  // Compatibility fallback while some environments still return no editedAt.
  return updatedAt - createdAt > 1000;
}
