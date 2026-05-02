package com.ghost.service;

import com.ghost.dto.response.QuestionResponse;
import com.ghost.exception.BadRequestException;
import com.ghost.model.Question;
import com.ghost.model.WhiteboardMembership;
import com.ghost.model.enums.QuestionStatus;
import com.ghost.model.enums.Role;
import com.ghost.repository.QuestionRepository;
import com.ghost.repository.WhiteboardMembershipRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class SearchService {

    private final QuestionRepository questionRepository;
    private final WhiteboardMembershipRepository whiteboardMembershipRepository;
    private final WhiteboardService whiteboardService;
    private final QuestionResponseAssembler questionResponseAssembler;

    private static final Duration SEARCH_CACHE_TTL = Duration.ofSeconds(30);
    private static final int SEARCH_CACHE_MAX_ENTRIES = 200;

    private final Map<SearchCacheKey, CachedSearchResult> searchCache = new ConcurrentHashMap<>();

    @Transactional(readOnly = true)
    public Page<QuestionResponse> search(
            UUID userId,
            String query,
            UUID whiteboardId,
            UUID topicId,
            String status,
            LocalDateTime startAt,
            LocalDateTime endAt,
            Pageable pageable
    ) {
        Map<UUID, Role> whiteboardRoles = new HashMap<>();

        if (whiteboardId != null) {
            WhiteboardMembership membership = whiteboardService.verifyMembership(userId, whiteboardId);
            whiteboardRoles.put(whiteboardId, membership.getRole());
        } else {
            for (WhiteboardMembership membership : whiteboardMembershipRepository.findByUserId(userId)) {
                whiteboardRoles.put(membership.getWhiteboard().getId(), membership.getRole());
            }
            if (whiteboardRoles.isEmpty()) {
                return Page.empty(pageable);
            }
        }
        if (startAt != null && endAt != null && startAt.isAfter(endAt)) {
            throw new BadRequestException("from must be before to");
        }

        QuestionStatus parsedStatus = null;
        if (status != null && !status.isBlank()) {
            try {
                parsedStatus = QuestionStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Invalid status filter: " + status);
            }
        }

        List<UUID> whiteboardIds = new ArrayList<>(whiteboardRoles.keySet());
        whiteboardIds.sort(Comparator.naturalOrder());
        String normalizedQuery = query != null && !query.isBlank() ? query.trim() : null;
        SearchCacheKey cacheKey = SearchCacheKey.from(
                userId,
                whiteboardRoles,
                normalizedQuery,
                topicId,
                parsedStatus != null ? parsedStatus.name() : null,
                startAt,
                endAt,
                pageable
        );
        CachedSearchResult cachedResult = searchCache.get(cacheKey);
        if (cachedResult != null && !cachedResult.isExpired()) {
            return cachedResult.toPage(pageable);
        }
        if (cachedResult != null) {
            searchCache.remove(cacheKey);
        }

        Page<Question> questionPage = questionRepository.searchWithFilters(
                whiteboardIds,
                normalizedQuery,
                topicId,
                parsedStatus != null ? parsedStatus.name() : null,
                startAt,
                endAt,
                pageable
        );

        Page<QuestionResponse> responsePage = questionPage
                .map(question -> {
                    Role role = whiteboardRoles.get(question.getWhiteboard().getId());
                    boolean includeModerationData = role == Role.FACULTY;
                    return questionResponseAssembler.toResponse(question, userId, includeModerationData);
                });
        cacheSearchResult(cacheKey, responsePage);
        return responsePage;
    }

    private void cacheSearchResult(SearchCacheKey cacheKey, Page<QuestionResponse> responsePage) {
        if (searchCache.size() >= SEARCH_CACHE_MAX_ENTRIES) {
            purgeExpiredCacheEntries();
        }
        if (searchCache.size() >= SEARCH_CACHE_MAX_ENTRIES) {
            searchCache.clear();
        }
        searchCache.put(cacheKey, CachedSearchResult.from(responsePage));
    }

    private void purgeExpiredCacheEntries() {
        searchCache.entrySet().removeIf(entry -> entry.getValue().isExpired());
    }

    private record SearchCacheKey(
            UUID userId,
            List<String> roleScope,
            String query,
            UUID topicId,
            String status,
            LocalDateTime startAt,
            LocalDateTime endAt,
            int page,
            int size,
            String sort
    ) {
        private static SearchCacheKey from(
                UUID userId,
                Map<UUID, Role> whiteboardRoles,
                String query,
                UUID topicId,
                String status,
                LocalDateTime startAt,
                LocalDateTime endAt,
                Pageable pageable
        ) {
            List<String> roleScope = whiteboardRoles.entrySet().stream()
                    .sorted(Map.Entry.comparingByKey())
                    .map(entry -> entry.getKey() + ":" + entry.getValue().name())
                    .toList();
            return new SearchCacheKey(
                    userId,
                    roleScope,
                    query,
                    topicId,
                    status,
                    startAt,
                    endAt,
                    pageable.getPageNumber(),
                    pageable.getPageSize(),
                    pageable.getSort().toString()
            );
        }
    }

    private record CachedSearchResult(
            List<QuestionResponse> content,
            long totalElements,
            Instant expiresAt
    ) {
        private static CachedSearchResult from(Page<QuestionResponse> responsePage) {
            return new CachedSearchResult(
                    List.copyOf(responsePage.getContent()),
                    responsePage.getTotalElements(),
                    Instant.now().plus(SEARCH_CACHE_TTL)
            );
        }

        private boolean isExpired() {
            return !Instant.now().isBefore(expiresAt);
        }

        private Page<QuestionResponse> toPage(Pageable pageable) {
            return new PageImpl<>(content, pageable, totalElements);
        }
    }
}
