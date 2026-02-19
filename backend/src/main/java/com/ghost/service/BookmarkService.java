package com.ghost.service;

import com.ghost.dto.response.BookmarkResponse;
import com.ghost.exception.BadRequestException;
import com.ghost.exception.ResourceNotFoundException;
import com.ghost.mapper.BookmarkMapper;
import com.ghost.model.Bookmark;
import com.ghost.model.Question;
import com.ghost.model.User;
import com.ghost.model.enums.AuditAction;
import com.ghost.model.enums.Role;
import com.ghost.repository.BookmarkRepository;
import com.ghost.repository.QuestionRepository;
import com.ghost.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookmarkService {

    private final BookmarkRepository bookmarkRepository;
    private final QuestionRepository questionRepository;
    private final UserRepository userRepository;
    private final WhiteboardService whiteboardService;
    private final AuditLogService auditLogService;
    private final BookmarkMapper bookmarkMapper;

    @Transactional
    public BookmarkResponse bookmark(UUID userId, UUID questionId) {
        // Check if already bookmarked
        if (bookmarkRepository.existsByUserIdAndQuestionId(userId, questionId)) {
            throw new BadRequestException("Question is already bookmarked");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new ResourceNotFoundException("Question", "id", questionId));

        var membership = whiteboardService.verifyMembership(userId, question.getWhiteboard().getId());

        Bookmark bookmark = Bookmark.builder()
                .user(user)
                .question(question)
                .build();

        Bookmark saved = bookmarkRepository.save(bookmark);
        auditLogService.logAction(
                question.getWhiteboard().getId(),
                userId,
                AuditAction.BOOKMARK_CREATED,
                "Question",
                questionId,
                null,
                "bookmarked"
        );
        return bookmarkMapper.toResponse(
                saved,
                userId,
                membership.getRole() == Role.FACULTY
        );
    }

    @Transactional
    public void removeBookmark(UUID userId, UUID questionId) {
        Bookmark bookmark = bookmarkRepository.findByUserIdAndQuestionId(userId, questionId)
                .orElseThrow(() -> new ResourceNotFoundException("Bookmark", "questionId", questionId));

        bookmarkRepository.delete(bookmark);
        auditLogService.logAction(
                bookmark.getQuestion().getWhiteboard().getId(),
                userId,
                AuditAction.BOOKMARK_REMOVED,
                "Question",
                questionId,
                "bookmarked",
                null
        );
    }

    @Transactional(readOnly = true)
    public Page<BookmarkResponse> getBookmarks(UUID userId, Pageable pageable) {
        return bookmarkRepository.findVisibleByUserId(userId, pageable)
                .map(bookmark -> {
                    var membership = whiteboardService.verifyMembership(
                            userId,
                            bookmark.getQuestion().getWhiteboard().getId()
                    );
                    boolean includeModerationData = membership.getRole() == Role.FACULTY;
                    return bookmarkMapper.toResponse(bookmark, userId, includeModerationData);
                });
    }

    @Transactional(readOnly = true)
    public boolean isBookmarked(UUID userId, UUID questionId) {
        return bookmarkRepository.existsByUserIdAndQuestionId(userId, questionId);
    }

    @Transactional(readOnly = true)
    public List<Bookmark> getBookmarksByQuestionId(UUID questionId) {
        return bookmarkRepository.findByQuestionId(questionId);
    }
}
