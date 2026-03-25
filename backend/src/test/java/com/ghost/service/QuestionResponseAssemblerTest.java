package com.ghost.service;

import com.ghost.dto.response.QuestionResponse;
import com.ghost.mapper.QuestionMapper;
import com.ghost.model.Course;
import com.ghost.model.Question;
import com.ghost.model.Semester;
import com.ghost.model.User;
import com.ghost.model.Whiteboard;
import com.ghost.model.enums.QuestionStatus;
import com.ghost.model.enums.VoteType;
import com.ghost.repository.BookmarkRepository;
import com.ghost.repository.CommentRepository;
import com.ghost.repository.KarmaVoteRepository;
import com.ghost.model.KarmaVote;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class QuestionResponseAssemblerTest {

    @Test
    void toResponseShouldAssembleVoteCountsAndBookmarkState() {
        CommentRepository commentRepository = mock(CommentRepository.class);
        KarmaVoteRepository karmaVoteRepository = mock(KarmaVoteRepository.class);
        BookmarkRepository bookmarkRepository = mock(BookmarkRepository.class);
        QuestionResponseAssembler assembler = new QuestionResponseAssembler(
                commentRepository,
                karmaVoteRepository,
                bookmarkRepository,
                new QuestionMapper()
        );

        UUID userId = UUID.randomUUID();
        UUID questionId = UUID.randomUUID();
        Question question = Question.builder()
                .id(questionId)
                .whiteboard(Whiteboard.builder()
                        .id(UUID.randomUUID())
                        .course(Course.builder().courseCode("IT326").courseName("Software Engineering").build())
                        .semester(Semester.builder().name("Fall 2026").build())
                        .build())
                .author(User.builder().id(UUID.randomUUID()).firstName("Taylor").lastName("Student").build())
                .title("Question title")
                .body("Question body")
                .status(QuestionStatus.OPEN)
                .karmaScore(5)
                .build();

        when(commentRepository.countByQuestionId(questionId)).thenReturn(4L);
        when(bookmarkRepository.existsByUserIdAndQuestionId(userId, questionId)).thenReturn(true);
        when(karmaVoteRepository.findByUserIdAndQuestionId(userId, questionId)).thenReturn(
                Optional.of(KarmaVote.builder().voteType(VoteType.UPVOTE).build())
        );

        QuestionResponse response = assembler.toResponse(question, userId, false);

        assertThat(response.getCommentCount()).isEqualTo(4);
        assertThat(response.getUserVote()).isEqualTo(VoteType.UPVOTE);
        assertThat(response.isBookmarked()).isTrue();
        assertThat(response.isHidden()).isFalse();
    }
}
