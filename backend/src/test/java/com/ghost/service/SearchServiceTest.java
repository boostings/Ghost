package com.ghost.service;

import com.ghost.dto.response.QuestionResponse;
import com.ghost.exception.BadRequestException;
import com.ghost.model.Course;
import com.ghost.model.Question;
import com.ghost.model.Semester;
import com.ghost.model.User;
import com.ghost.model.Whiteboard;
import com.ghost.model.WhiteboardMembership;
import com.ghost.model.enums.QuestionStatus;
import com.ghost.model.enums.Role;
import com.ghost.repository.QuestionRepository;
import com.ghost.repository.WhiteboardMembershipRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SearchServiceTest {

    @Mock
    private QuestionRepository questionRepository;

    @Mock
    private WhiteboardMembershipRepository whiteboardMembershipRepository;

    @Mock
    private WhiteboardService whiteboardService;

    @Mock
    private QuestionResponseAssembler questionResponseAssembler;

    @InjectMocks
    private SearchService searchService;

    private UUID userId;
    private UUID whiteboardId;
    private PageRequest pageable;
    private Question question;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        whiteboardId = UUID.randomUUID();
        pageable = PageRequest.of(0, 20);

        Whiteboard whiteboard = Whiteboard.builder()
                .id(whiteboardId)
                .course(Course.builder().courseCode("IT326").courseName("Software Engineering").build())
                .semester(Semester.builder().name("Fall 2026").build())
                .build();

        question = Question.builder()
                .id(UUID.randomUUID())
                .whiteboard(whiteboard)
                .author(User.builder().id(UUID.randomUUID()).build())
                .title("How does the search work?")
                .body("Looking for search behavior.")
                .status(QuestionStatus.OPEN)
                .build();
    }

    @Test
    void searchShouldReturnEmptyPageWhenUserHasNoMemberships() {
        when(whiteboardMembershipRepository.findByUserId(userId)).thenReturn(List.of());

        Page<QuestionResponse> result = searchService.search(
                userId,
                "search",
                null,
                null,
                null,
                null,
                null,
                pageable
        );

        assertThat(result).isEmpty();
        verify(questionRepository, never()).searchWithFilters(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void searchShouldRejectInvertedDateRange() {
        when(whiteboardMembershipRepository.findByUserId(userId)).thenReturn(List.of(membership(Role.STUDENT)));

        assertThatThrownBy(() -> searchService.search(
                userId,
                "search",
                null,
                null,
                null,
                LocalDateTime.of(2026, 4, 8, 12, 0),
                LocalDateTime.of(2026, 4, 7, 12, 0),
                pageable
        ))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("from must be before to");
    }

    @Test
    void searchShouldRejectInvalidStatusFilter() {
        when(whiteboardMembershipRepository.findByUserId(userId)).thenReturn(List.of(membership(Role.STUDENT)));

        assertThatThrownBy(() -> searchService.search(
                userId,
                "search",
                null,
                null,
                "not-a-status",
                null,
                null,
                pageable
        ))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Invalid status filter");
    }

    @Test
    void searchShouldVerifySpecificWhiteboardMembershipWhenWhiteboardFilterProvided() {
        QuestionResponse response = QuestionResponse.builder().id(question.getId()).build();
        when(whiteboardService.verifyMembership(userId, whiteboardId)).thenReturn(membership(Role.FACULTY));
        when(questionRepository.searchWithFilters(
                eq(List.of(whiteboardId)),
                eq("search"),
                eq(null),
                eq(QuestionStatus.OPEN.name()),
                eq(null),
                eq(null),
                eq(pageable)
        )).thenReturn(new PageImpl<>(List.of(question), pageable, 1));
        when(questionResponseAssembler.toResponse(question, userId, true)).thenReturn(response);

        Page<QuestionResponse> result = searchService.search(
                userId,
                "  search  ",
                whiteboardId,
                null,
                "open",
                null,
                null,
                pageable
        );

        assertThat(result.getContent()).containsExactly(response);
        verify(whiteboardService).verifyMembership(userId, whiteboardId);
    }

    @Test
    void searchShouldMapFacultyMembershipsWithModerationData() {
        QuestionResponse response = QuestionResponse.builder().id(question.getId()).build();
        when(whiteboardMembershipRepository.findByUserId(userId)).thenReturn(List.of(membership(Role.FACULTY)));
        when(questionRepository.searchWithFilters(
                eq(List.of(whiteboardId)),
                eq("search"),
                eq(null),
                eq(null),
                eq(null),
                eq(null),
                eq(pageable)
        )).thenReturn(new PageImpl<>(List.of(question), pageable, 1));
        when(questionResponseAssembler.toResponse(question, userId, true)).thenReturn(response);

        Page<QuestionResponse> result = searchService.search(
                userId,
                "search",
                null,
                null,
                null,
                null,
                null,
                pageable
        );

        assertThat(result.getContent()).containsExactly(response);
        verify(questionResponseAssembler).toResponse(question, userId, true);
    }

    @Test
    void searchShouldMapStudentMembershipsWithoutModerationData() {
        QuestionResponse response = QuestionResponse.builder().id(question.getId()).build();
        when(whiteboardMembershipRepository.findByUserId(userId)).thenReturn(List.of(membership(Role.STUDENT)));
        when(questionRepository.searchWithFilters(
                eq(List.of(whiteboardId)),
                eq("search"),
                eq(null),
                eq(null),
                eq(null),
                eq(null),
                eq(pageable)
        )).thenReturn(new PageImpl<>(List.of(question), pageable, 1));
        when(questionResponseAssembler.toResponse(question, userId, false)).thenReturn(response);

        Page<QuestionResponse> result = searchService.search(
                userId,
                "search",
                null,
                null,
                null,
                null,
                null,
                pageable
        );

        assertThat(result.getContent()).containsExactly(response);
        verify(questionResponseAssembler).toResponse(question, userId, false);
    }

    @Test
    void searchShouldCacheEquivalentQueriesForThirtySeconds() {
        QuestionResponse response = QuestionResponse.builder().id(question.getId()).build();
        when(whiteboardMembershipRepository.findByUserId(userId)).thenReturn(List.of(membership(Role.STUDENT)));
        when(questionRepository.searchWithFilters(
                eq(List.of(whiteboardId)),
                eq("search"),
                eq(null),
                eq(null),
                eq(null),
                eq(null),
                eq(pageable)
        )).thenReturn(new PageImpl<>(List.of(question), pageable, 1));
        when(questionResponseAssembler.toResponse(question, userId, false)).thenReturn(response);

        Page<QuestionResponse> firstResult = searchService.search(
                userId,
                "search",
                null,
                null,
                null,
                null,
                null,
                pageable
        );
        Page<QuestionResponse> secondResult = searchService.search(
                userId,
                " search ",
                null,
                null,
                null,
                null,
                null,
                pageable
        );

        assertThat(firstResult.getContent()).containsExactly(response);
        assertThat(secondResult.getContent()).containsExactly(response);
        verify(questionRepository, times(1)).searchWithFilters(any(), any(), any(), any(), any(), any(), any());
        verify(questionResponseAssembler, times(1)).toResponse(question, userId, false);
    }

    private WhiteboardMembership membership(Role role) {
        return WhiteboardMembership.builder()
                .user(User.builder().id(userId).build())
                .whiteboard(question.getWhiteboard())
                .role(role)
                .build();
    }
}
