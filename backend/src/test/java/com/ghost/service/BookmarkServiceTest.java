package com.ghost.service;

import com.ghost.dto.response.BookmarkResponse;
import com.ghost.dto.response.QuestionResponse;
import com.ghost.exception.BadRequestException;
import com.ghost.mapper.BookmarkMapper;
import com.ghost.model.Bookmark;
import com.ghost.model.Question;
import com.ghost.model.User;
import com.ghost.model.Whiteboard;
import com.ghost.model.WhiteboardMembership;
import com.ghost.model.enums.AuditAction;
import com.ghost.model.enums.Role;
import com.ghost.repository.BookmarkRepository;
import com.ghost.repository.QuestionRepository;
import com.ghost.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookmarkServiceTest {

    @Mock
    private BookmarkRepository bookmarkRepository;

    @Mock
    private QuestionRepository questionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private WhiteboardService whiteboardService;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private QuestionResponseAssembler questionResponseAssembler;

    @Mock
    private BookmarkMapper bookmarkMapper;

    @InjectMocks
    private BookmarkService bookmarkService;

    private UUID userId;
    private UUID questionId;
    private UUID whiteboardId;
    private User user;
    private Question question;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        questionId = UUID.randomUUID();
        whiteboardId = UUID.randomUUID();

        user = User.builder()
                .id(userId)
                .build();
        question = Question.builder()
                .id(questionId)
                .whiteboard(Whiteboard.builder().id(whiteboardId).build())
                .build();
    }

    @Test
    void bookmarkShouldPersistAuditAndMapResponse() {
        Bookmark bookmark = Bookmark.builder()
                .id(UUID.randomUUID())
                .user(user)
                .question(question)
                .build();
        QuestionResponse questionResponse = QuestionResponse.builder()
                .id(questionId)
                .title("Bookmarked question")
                .build();
        BookmarkResponse bookmarkResponse = BookmarkResponse.builder()
                .id(bookmark.getId())
                .question(questionResponse)
                .build();
        WhiteboardMembership membership = WhiteboardMembership.builder()
                .whiteboard(question.getWhiteboard())
                .user(user)
                .role(Role.FACULTY)
                .build();

        when(bookmarkRepository.existsByUserIdAndQuestionId(userId, questionId)).thenReturn(false);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(questionRepository.findById(questionId)).thenReturn(Optional.of(question));
        when(whiteboardService.verifyMembership(userId, whiteboardId)).thenReturn(membership);
        when(bookmarkRepository.save(any(Bookmark.class))).thenReturn(bookmark);
        when(questionResponseAssembler.toResponse(question, userId, true)).thenReturn(questionResponse);
        when(bookmarkMapper.toResponse(bookmark, questionResponse)).thenReturn(bookmarkResponse);

        BookmarkResponse response = bookmarkService.bookmark(userId, questionId);

        verify(bookmarkRepository).save(any(Bookmark.class));
        verify(auditLogService).logAction(
                whiteboardId,
                userId,
                AuditAction.BOOKMARK_CREATED,
                "Question",
                questionId,
                null,
                "bookmarked"
        );
        verify(questionResponseAssembler).toResponse(question, userId, true);
        verify(bookmarkMapper).toResponse(bookmark, questionResponse);
        assertThat(response).isEqualTo(bookmarkResponse);
    }

    @Test
    void bookmarkShouldRejectDuplicates() {
        when(bookmarkRepository.existsByUserIdAndQuestionId(userId, questionId)).thenReturn(true);

        assertThatThrownBy(() -> bookmarkService.bookmark(userId, questionId))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("already bookmarked");

        verify(bookmarkRepository, never()).save(any(Bookmark.class));
    }

    @Test
    void removeBookmarkShouldDeleteExistingBookmarkAndAudit() {
        Bookmark bookmark = Bookmark.builder()
                .user(user)
                .question(question)
                .build();
        when(bookmarkRepository.findByUserIdAndQuestionId(userId, questionId)).thenReturn(Optional.of(bookmark));

        bookmarkService.removeBookmark(userId, questionId);

        verify(bookmarkRepository).delete(bookmark);
        verify(auditLogService).logAction(
                whiteboardId,
                userId,
                AuditAction.BOOKMARK_REMOVED,
                "Question",
                questionId,
                "bookmarked",
                null
        );
    }

    @Test
    void getBookmarksShouldMapVisibleQuestionsWithMembershipContext() {
        Bookmark bookmark = Bookmark.builder()
                .id(UUID.randomUUID())
                .user(user)
                .question(question)
                .build();
        QuestionResponse questionResponse = QuestionResponse.builder()
                .id(questionId)
                .title("Visible question")
                .build();
        BookmarkResponse bookmarkResponse = BookmarkResponse.builder()
                .id(bookmark.getId())
                .question(questionResponse)
                .build();
        WhiteboardMembership membership = WhiteboardMembership.builder()
                .whiteboard(question.getWhiteboard())
                .user(user)
                .role(Role.STUDENT)
                .build();

        when(bookmarkRepository.findVisibleByUserId(eq(userId), any()))
                .thenReturn(new PageImpl<>(List.of(bookmark), PageRequest.of(0, 20), 1));
        when(whiteboardService.verifyMembership(userId, whiteboardId)).thenReturn(membership);
        when(questionResponseAssembler.toResponse(question, userId, false)).thenReturn(questionResponse);
        when(bookmarkMapper.toResponse(bookmark, questionResponse)).thenReturn(bookmarkResponse);

        var page = bookmarkService.getBookmarks(userId, PageRequest.of(0, 20));

        verify(questionResponseAssembler).toResponse(question, userId, false);
        verify(bookmarkMapper).toResponse(bookmark, questionResponse);
        assertThat(page.getContent()).containsExactly(bookmarkResponse);
    }

    @Test
    void bookmarkLookupsShouldUseRepositoryQueries() {
        Bookmark bookmark = Bookmark.builder()
                .id(UUID.randomUUID())
                .question(question)
                .user(user)
                .build();
        when(bookmarkRepository.existsByUserIdAndQuestionId(userId, questionId)).thenReturn(true);
        when(bookmarkRepository.findByQuestionId(questionId)).thenReturn(List.of(bookmark));

        assertThat(bookmarkService.isBookmarked(userId, questionId)).isTrue();
        assertThat(bookmarkService.getBookmarksByQuestionId(questionId)).containsExactly(bookmark);
    }
}
