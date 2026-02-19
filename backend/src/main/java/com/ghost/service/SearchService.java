package com.ghost.service;

import com.ghost.dto.response.QuestionResponse;
import com.ghost.exception.BadRequestException;
import com.ghost.mapper.QuestionMapper;
import com.ghost.model.WhiteboardMembership;
import com.ghost.model.enums.QuestionStatus;
import com.ghost.model.enums.Role;
import com.ghost.repository.QuestionRepository;
import com.ghost.repository.WhiteboardMembershipRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
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
    public Page<QuestionResponse> search(UUID userId, String query, UUID whiteboardId, UUID topicId,
                                         String status, Pageable pageable) {
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

        QuestionStatus parsedStatus = null;
        if (status != null && !status.isBlank()) {
            try {
                parsedStatus = QuestionStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Invalid status filter: " + status);
            }
        }

        Specification<com.ghost.model.Question> spec = Specification.where(notHidden());
        if (whiteboardId != null) {
            spec = spec.and(inWhiteboard(whiteboardId));
        } else {
            spec = spec.and(inWhiteboards(whiteboardRoles.keySet()));
        }
        if (topicId != null) {
            spec = spec.and(hasTopic(topicId));
        }
        if (parsedStatus != null) {
            spec = spec.and(hasStatus(parsedStatus));
        }
        if (query != null && !query.isBlank()) {
            spec = spec.and(matchesQuery(query.trim()));
        }

        Pageable sortedPageable = pageable.getSort().isSorted()
                ? pageable
                : PageRequest.of(
                        pageable.getPageNumber(),
                        pageable.getPageSize(),
                        Sort.by(Sort.Order.desc("isPinned"), Sort.Order.desc("createdAt"))
                );

        return questionRepository.findAll(spec, sortedPageable)
                .map(question -> {
                    Role role = whiteboardRoles.get(question.getWhiteboard().getId());
                    boolean includeModerationData = role == Role.FACULTY;
                    return questionMapper.toResponse(question, userId, includeModerationData);
                });
    }

    private Specification<com.ghost.model.Question> notHidden() {
        return (root, query, cb) -> cb.isFalse(root.get("isHidden"));
    }

    private Specification<com.ghost.model.Question> inWhiteboard(UUID whiteboardId) {
        return (root, query, cb) -> cb.equal(root.get("whiteboard").get("id"), whiteboardId);
    }

    private Specification<com.ghost.model.Question> inWhiteboards(Iterable<UUID> whiteboardIds) {
        return (root, query, cb) -> root.get("whiteboard").get("id").in(whiteboardIds);
    }

    private Specification<com.ghost.model.Question> hasTopic(UUID topicId) {
        return (root, query, cb) -> cb.equal(root.get("topic").get("id"), topicId);
    }

    private Specification<com.ghost.model.Question> hasStatus(QuestionStatus status) {
        return (root, query, cb) -> cb.equal(root.get("status"), status);
    }

    private Specification<com.ghost.model.Question> matchesQuery(String queryText) {
        return (root, query, cb) -> {
            String likePattern = "%" + queryText.toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("title")), likePattern),
                    cb.like(cb.lower(root.get("body")), likePattern)
            );
        };
    }
}
