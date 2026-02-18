package com.ghost.controller;

import com.ghost.dto.response.PageResponse;
import com.ghost.dto.response.QuestionResponse;
import com.ghost.model.Question;
import com.ghost.model.enums.VoteType;
import com.ghost.repository.BookmarkRepository;
import com.ghost.repository.CommentRepository;
import com.ghost.repository.KarmaVoteRepository;
import com.ghost.service.SearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;
    private final CommentRepository commentRepository;
    private final KarmaVoteRepository karmaVoteRepository;
    private final BookmarkRepository bookmarkRepository;

    @GetMapping("/questions")
    public ResponseEntity<PageResponse<QuestionResponse>> searchQuestions(
            @AuthenticationPrincipal String userIdStr,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) UUID whiteboard,
            @RequestParam(required = false) UUID topic,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UUID userId = UUID.fromString(userIdStr);
        Pageable pageable = PageRequest.of(page, size);
        Page<Question> questionPage = searchService.search(q, whiteboard, topic, status, pageable);
        List<QuestionResponse> content = questionPage.getContent().stream()
                .map(question -> mapToQuestionResponse(question, userId))
                .collect(Collectors.toList());
        PageResponse<QuestionResponse> response = PageResponse.<QuestionResponse>builder()
                .content(content)
                .page(questionPage.getNumber())
                .size(questionPage.getSize())
                .totalElements(questionPage.getTotalElements())
                .totalPages(questionPage.getTotalPages())
                .build();
        return ResponseEntity.ok(response);
    }

    private QuestionResponse mapToQuestionResponse(Question q, UUID currentUserId) {
        long commentCount = commentRepository.findByQuestionIdOrderByCreatedAtAsc(q.getId()).size();
        VoteType userVote = karmaVoteRepository.findByUserIdAndQuestionId(currentUserId, q.getId())
                .map(v -> v.getVoteType())
                .orElse(null);
        boolean isBookmarked = bookmarkRepository.existsByUserIdAndQuestionId(currentUserId, q.getId());

        return QuestionResponse.builder()
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
                .isBookmarked(isBookmarked)
                .createdAt(q.getCreatedAt())
                .updatedAt(q.getUpdatedAt())
                .build();
    }
}
