type QuestionEditMeta = {
  editedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export function isQuestionEdited(question?: QuestionEditMeta | null): boolean {
  if (!question) {
    return false;
  }

  return Boolean(question.editedAt);
}
