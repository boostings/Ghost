package com.ghost.service;

import com.ghost.dto.response.CommentResponse;
import com.ghost.mapper.CommentMapper;
import com.ghost.model.Comment;
import com.ghost.model.KarmaVote;
import com.ghost.model.Question;
import com.ghost.model.User;
import com.ghost.model.enums.VoteType;
import com.ghost.repository.KarmaVoteRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CommentResponseAssemblerTest {

    @Test
    void toResponseShouldAssembleVerifierAndUserVote() {
        KarmaVoteRepository karmaVoteRepository = mock(KarmaVoteRepository.class);
        CommentResponseAssembler assembler = new CommentResponseAssembler(
                karmaVoteRepository,
                new CommentMapper()
        );

        UUID userId = UUID.randomUUID();
        UUID commentId = UUID.randomUUID();
        User author = User.builder().id(UUID.randomUUID()).firstName("Alex").lastName("Author").build();
        User verifier = User.builder().id(UUID.randomUUID()).firstName("Pat").lastName("Faculty").build();
        Comment comment = Comment.builder()
                .id(commentId)
                .question(Question.builder().id(UUID.randomUUID()).build())
                .author(author)
                .verifiedBy(verifier)
                .body("Answer body")
                .editDeadline(LocalDateTime.now().plusMinutes(5))
                .build();

        when(karmaVoteRepository.findByUserIdAndCommentId(userId, commentId)).thenReturn(
                Optional.of(KarmaVote.builder().voteType(VoteType.DOWNVOTE).build())
        );

        CommentResponse response = assembler.toResponse(comment, userId, false);

        assertThat(response.isVerifiedAnswer()).isTrue();
        assertThat(response.getVerifiedByName()).isEqualTo("Pat Faculty");
        assertThat(response.getUserVote()).isEqualTo(VoteType.DOWNVOTE);
        assertThat(response.isCanEdit()).isFalse();
    }

    @Test
    void toResponseShouldAllowAuthorToEditWithinOneHourOfCreationWhenLegacyDeadlineExpired() {
        KarmaVoteRepository karmaVoteRepository = mock(KarmaVoteRepository.class);
        CommentResponseAssembler assembler = new CommentResponseAssembler(
                karmaVoteRepository,
                new CommentMapper()
        );

        UUID userId = UUID.randomUUID();
        UUID commentId = UUID.randomUUID();
        User author = User.builder().id(userId).firstName("Alex").lastName("Author").build();
        Comment comment = Comment.builder()
                .id(commentId)
                .question(Question.builder().id(UUID.randomUUID()).build())
                .author(author)
                .body("Recent comment")
                .createdAt(LocalDateTime.now().minusMinutes(59))
                .editDeadline(LocalDateTime.now().minusMinutes(44))
                .build();

        when(karmaVoteRepository.findByUserIdAndCommentId(userId, commentId)).thenReturn(Optional.empty());

        CommentResponse response = assembler.toResponse(comment, userId, false);

        assertThat(response.isCanEdit()).isTrue();
    }

    @Test
    void toResponseShouldHideAnonymousAuthorFromOtherStudents() {
        KarmaVoteRepository karmaVoteRepository = mock(KarmaVoteRepository.class);
        CommentResponseAssembler assembler = new CommentResponseAssembler(
                karmaVoteRepository,
                new CommentMapper()
        );

        UUID viewerId = UUID.randomUUID();
        UUID commentId = UUID.randomUUID();
        User author = User.builder()
                .id(UUID.randomUUID())
                .firstName("Alex")
                .lastName("Author")
                .anonymousMode(true)
                .build();
        Comment comment = Comment.builder()
                .id(commentId)
                .question(Question.builder().id(UUID.randomUUID()).build())
                .author(author)
                .body("Comment body")
                .createdAt(LocalDateTime.now())
                .editDeadline(LocalDateTime.now().plusMinutes(5))
                .build();

        when(karmaVoteRepository.findByUserIdAndCommentId(viewerId, commentId)).thenReturn(Optional.empty());

        CommentResponse response = assembler.toResponse(comment, viewerId, false);

        assertThat(response.getAuthorId()).isNull();
        assertThat(response.getAuthorName()).isEqualTo("Ghost");
    }

    @Test
    void toResponseShouldShowAnonymousAuthorToFaculty() {
        KarmaVoteRepository karmaVoteRepository = mock(KarmaVoteRepository.class);
        CommentResponseAssembler assembler = new CommentResponseAssembler(
                karmaVoteRepository,
                new CommentMapper()
        );

        UUID facultyId = UUID.randomUUID();
        UUID commentId = UUID.randomUUID();
        User author = User.builder()
                .id(UUID.randomUUID())
                .firstName("Alex")
                .lastName("Author")
                .anonymousMode(true)
                .build();
        Comment comment = Comment.builder()
                .id(commentId)
                .question(Question.builder().id(UUID.randomUUID()).build())
                .author(author)
                .body("Comment body")
                .createdAt(LocalDateTime.now())
                .editDeadline(LocalDateTime.now().plusMinutes(5))
                .build();

        when(karmaVoteRepository.findByUserIdAndCommentId(facultyId, commentId)).thenReturn(Optional.empty());

        CommentResponse response = assembler.toResponse(comment, facultyId, true);

        assertThat(response.getAuthorId()).isEqualTo(author.getId());
        assertThat(response.getAuthorName()).isEqualTo("Alex Author");
    }
}
