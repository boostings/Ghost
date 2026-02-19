package com.ghost.service;

import com.ghost.dto.response.QuestionResponse;
import com.ghost.exception.BadRequestException;
import com.ghost.mapper.QuestionMapper;
import com.ghost.model.Question;
import com.ghost.model.WhiteboardMembership;
import com.ghost.model.enums.QuestionStatus;
import com.ghost.model.enums.Role;
import com.ghost.repository.QuestionRepository;
import com.ghost.repository.WhiteboardMembershipRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SearchService {

    private final QuestionRepository questionRepository;
    private final WhiteboardMembershipRepository whiteboardMembershipRepository;
    private final WhiteboardService whiteboardService;
    private final QuestionMapper questionMapper;

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
        String normalizedQuery = query != null && !query.isBlank() ? query.trim() : null;

        Page<Question> questionPage = questionRepository.searchWithFilters(
                whiteboardIds,
                normalizedQuery,
                topicId,
                parsedStatus != null ? parsedStatus.name() : null,
                startAt,
                endAt,
                pageable
        );

        return questionPage
                .map(question -> {
                    Role role = whiteboardRoles.get(question.getWhiteboard().getId());
                    boolean includeModerationData = role == Role.FACULTY;
                    return questionMapper.toResponse(question, userId, includeModerationData);
                });
    }
}
