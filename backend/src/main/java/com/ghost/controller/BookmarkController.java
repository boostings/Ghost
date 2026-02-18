package com.ghost.controller;

import com.ghost.dto.response.BookmarkResponse;
import com.ghost.dto.response.QuestionResponse;
import com.ghost.model.Bookmark;
import com.ghost.model.Question;
import com.ghost.model.enums.VoteType;
import com.ghost.repository.BookmarkRepository;
import com.ghost.repository.CommentRepository;
import com.ghost.repository.KarmaVoteRepository;
import com.ghost.service.BookmarkService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/bookmarks")
@RequiredArgsConstructor
public class BookmarkController {

    private final BookmarkService bookmarkService;
    private final BookmarkRepository bookmarkRepository;
    private final CommentRepository commentRepository;
    private final KarmaVoteRepository karmaVoteRepository;

    @GetMapping
    public ResponseEntity<List<BookmarkResponse>> getBookmarks(
            @AuthenticationPrincipal String userIdStr) {
        UUID userId = UUID.fromString(userIdStr);
        List<Bookmark> bookmarks = bookmarkService.getBookmarks(userId);
        List<BookmarkResponse> response = bookmarks.stream()
                .map(b -> mapToBookmarkResponse(b, userId))
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/questions/{id}")
    public ResponseEntity<Void> bookmarkQuestion(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        bookmarkService.bookmark(userId, id);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/questions/{id}")
    public ResponseEntity<Void> removeBookmark(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        bookmarkService.removeBookmark(userId, id);
        return ResponseEntity.noContent().build();
    }

    private BookmarkResponse mapToBookmarkResponse(Bookmark bookmark, UUID currentUserId) {
        Question q = bookmark.getQuestion();
        long commentCount = commentRepository.findByQuestionIdOrderByCreatedAtAsc(q.getId()).size();
        VoteType userVote = karmaVoteRepository.findByUserIdAndQuestionId(currentUserId, q.getId())
                .map(v -> v.getVoteType())
                .orElse(null);

        QuestionResponse questionResponse = QuestionResponse.builder()
                .id(q.getId())
                .whiteboardId(q.getWhiteboard().getId())
                .authorId(q.getAuthor().getId())
                .authorName(q.getAuthor().getFirstName() + " " + q.getAuthor().getLastName())
                .topicId(q.getTopic() != null ? q.getTopic().getId() : null)
                .topicName(q.getTopic() != null ? q.getTopic().getName() : null)
                .title(q.getTitle())
                .body(q.getBody())
                .status(q.getStatus())
                .isPinned(q.isPinned())
                .isHidden(q.isHidden())
                .karmaScore(q.getKarmaScore())
                .userVote(userVote)
                .commentCount(commentCount)
                .verifiedAnswerId(q.getVerifiedAnswerId())
                .isBookmarked(true)
                .createdAt(q.getCreatedAt())
                .updatedAt(q.getUpdatedAt())
                .build();

        return BookmarkResponse.builder()
                .id(bookmark.getId())
                .question(questionResponse)
                .createdAt(bookmark.getCreatedAt())
                .build();
    }
}
