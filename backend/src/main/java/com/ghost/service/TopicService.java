package com.ghost.service;

import com.ghost.dto.response.TopicResponse;
import com.ghost.exception.BadRequestException;
import com.ghost.exception.ForbiddenException;
import com.ghost.exception.ResourceNotFoundException;
import com.ghost.mapper.TopicMapper;
import com.ghost.model.Topic;
import com.ghost.model.Whiteboard;
import com.ghost.model.enums.AuditAction;
import com.ghost.model.enums.Role;
import com.ghost.repository.TopicRepository;
import com.ghost.repository.WhiteboardMembershipRepository;
import com.ghost.repository.WhiteboardRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TopicService {

    private final TopicRepository topicRepository;
    private final WhiteboardRepository whiteboardRepository;
    private final WhiteboardMembershipRepository whiteboardMembershipRepository;
    private final AuditLogService auditLogService;
    private final TopicMapper topicMapper;

    private static final List<String> DEFAULT_TOPIC_NAMES = Arrays.asList(
            "Homework", "Exam", "Lecture", "General"
    );

    @Transactional(readOnly = true)
    public Page<TopicResponse> getTopics(UUID userId, UUID whiteboardId, Pageable pageable) {
        verifyMembership(userId, whiteboardId);
        return topicRepository.findByWhiteboardIdOrderByNameAsc(whiteboardId, pageable)
                .map(topicMapper::toResponse);
    }

    @Transactional
    public TopicResponse createTopic(UUID facultyId, UUID whiteboardId, String name) {
        verifyFacultyRole(facultyId, whiteboardId);
        Whiteboard whiteboard = getWhiteboard(whiteboardId);
        String normalizedName = name.trim();

        if (topicRepository.findByWhiteboardIdAndName(whiteboardId, normalizedName).isPresent()) {
            throw new BadRequestException("Topic already exists in this whiteboard");
        }

        Topic topic = Topic.builder()
                .whiteboard(whiteboard)
                .name(normalizedName)
                .isDefault(false)
                .build();

        topic = topicRepository.save(topic);

        auditLogService.logAction(
                whiteboardId, facultyId, AuditAction.TOPIC_CREATED,
                "Topic", topic.getId(), null, normalizedName
        );

        return topicMapper.toResponse(topic);
    }

    @Transactional
    public void deleteTopic(UUID facultyId, UUID whiteboardId, UUID topicId) {
        Topic topic = topicRepository.findById(topicId)
                .orElseThrow(() -> new ResourceNotFoundException("Topic", "id", topicId));

        if (!topic.getWhiteboard().getId().equals(whiteboardId)) {
            throw new ResourceNotFoundException("Topic", "id", topicId);
        }
        verifyFacultyRole(facultyId, whiteboardId);

        if (topic.isDefault()) {
            throw new BadRequestException("Cannot delete default topics");
        }

        auditLogService.logAction(
                whiteboardId, facultyId, AuditAction.TOPIC_DELETED,
                "Topic", topicId, topic.getName(), null
        );

        topicRepository.delete(topic);
    }

    @Transactional
    public void createDefaultTopics(UUID whiteboardId, UUID actorId) {
        Whiteboard whiteboard = getWhiteboard(whiteboardId);

        for (String topicName : DEFAULT_TOPIC_NAMES) {
            Topic topic = Topic.builder()
                    .whiteboard(whiteboard)
                    .name(topicName)
                    .isDefault(true)
                    .build();
            Topic saved = topicRepository.save(topic);
            auditLogService.logAction(
                    whiteboardId,
                    actorId,
                    AuditAction.TOPIC_CREATED,
                    "Topic",
                    saved.getId(),
                    null,
                    topicName
            );
        }

        log.debug("Default topics created for whiteboard: {}", whiteboardId);
    }

    private Whiteboard getWhiteboard(UUID whiteboardId) {
        return whiteboardRepository.findById(whiteboardId)
                .orElseThrow(() -> new ResourceNotFoundException("Whiteboard", "id", whiteboardId));
    }

    private void verifyMembership(UUID userId, UUID whiteboardId) {
        whiteboardMembershipRepository.findByWhiteboardIdAndUserId(whiteboardId, userId)
                .orElseThrow(() -> new ForbiddenException("You are not a member of this whiteboard"));
    }

    private void verifyFacultyRole(UUID userId, UUID whiteboardId) {
        var membership = whiteboardMembershipRepository.findByWhiteboardIdAndUserId(whiteboardId, userId)
                .orElseThrow(() -> new ForbiddenException("You are not a member of this whiteboard"));
        if (membership.getRole() != Role.FACULTY) {
            throw new ForbiddenException("Only faculty members can perform this action");
        }
    }
}
