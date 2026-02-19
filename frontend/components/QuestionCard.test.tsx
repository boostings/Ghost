import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import QuestionCard from './QuestionCard';
import type { QuestionResponse } from '../types';

function makeQuestion(): QuestionResponse {
  return {
    id: 'q-1',
    whiteboardId: 'wb-1',
    authorId: 'u-1',
    authorName: 'Taylor Student',
    topicId: 't-1',
    topicName: 'Homework',
    title: 'Where do we submit assignment 3?',
    body: 'I cannot find the submission link.',
    status: 'OPEN',
    isPinned: false,
    isHidden: false,
    karmaScore: 2,
    userVote: null,
    commentCount: 4,
    verifiedAnswerId: null,
    isBookmarked: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe('QuestionCard', () => {
  it('renders question content and triggers action callbacks', () => {
    const onPress = jest.fn();
    const onUpvote = jest.fn();
    const onDownvote = jest.fn();
    const onBookmark = jest.fn();
    const onReport = jest.fn();
    const { getByText, getByLabelText } = render(
      <QuestionCard
        question={makeQuestion()}
        onPress={onPress}
        onUpvote={onUpvote}
        onDownvote={onDownvote}
        onBookmark={onBookmark}
        onReport={onReport}
      />
    );

    expect(getByText('Where do we submit assignment 3?')).toBeTruthy();
    expect(getByText('Taylor Student')).toBeTruthy();

    fireEvent.press(getByLabelText('Upvote'));
    fireEvent.press(getByLabelText('Downvote'));
    fireEvent.press(getByLabelText('Add bookmark'));
    fireEvent.press(getByLabelText('Report question'));

    expect(onUpvote).toHaveBeenCalledTimes(1);
    expect(onDownvote).toHaveBeenCalledTimes(1);
    expect(onBookmark).toHaveBeenCalledTimes(1);
    expect(onReport).toHaveBeenCalledTimes(1);
  });
});
