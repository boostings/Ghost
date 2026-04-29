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
}
