package com.ghost.service;

import com.ghost.exception.BadRequestException;
import com.ghost.exception.ResourceNotFoundException;
import com.ghost.model.Topic;
import com.ghost.model.Whiteboard;
import com.ghost.model.enums.AuditAction;
import com.ghost.repository.TopicRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
    private final WhiteboardService whiteboardService;
    private final AuditLogService auditLogService;

    private static final List<String> DEFAULT_TOPIC_NAMES = Arrays.asList(
            "Homework", "Exam", "Lecture", "General"
    );

    @Transactional(readOnly = true)
    public List<Topic> getTopics(UUID whiteboardId) {
        return topicRepository.findByWhiteboardId(whiteboardId);
    }

    @Transactional
    public Topic createTopic(UUID facultyId, UUID whiteboardId, String name) {
        whiteboardService.verifyFacultyRole(facultyId, whiteboardId);

        Whiteboard whiteboard = whiteboardService.getWhiteboardById(whiteboardId);

        Topic topic = Topic.builder()
                .whiteboard(whiteboard)
                .name(name)
                .isDefault(false)
                .build();

        topic = topicRepository.save(topic);

        auditLogService.logAction(
                whiteboardId, facultyId, AuditAction.TOPIC_CREATED,
                "Topic", topic.getId(), null, name
        );

        return topic;
    }

    @Transactional
    public void deleteTopic(UUID facultyId, UUID topicId) {
        Topic topic = topicRepository.findById(topicId)
                .orElseThrow(() -> new ResourceNotFoundException("Topic", "id", topicId));

        whiteboardService.verifyFacultyRole(facultyId, topic.getWhiteboard().getId());

        if (topic.isDefault()) {
            throw new BadRequestException("Cannot delete default topics");
        }

        auditLogService.logAction(
                topic.getWhiteboard().getId(), facultyId, AuditAction.TOPIC_DELETED,
                "Topic", topicId, topic.getName(), null
        );

        topicRepository.delete(topic);
    }

    @Transactional
    public void createDefaultTopics(UUID whiteboardId) {
        Whiteboard whiteboard = whiteboardService.getWhiteboardById(whiteboardId);

        for (String topicName : DEFAULT_TOPIC_NAMES) {
            Topic topic = Topic.builder()
                    .whiteboard(whiteboard)
                    .name(topicName)
                    .isDefault(true)
                    .build();
            topicRepository.save(topic);
        }

        log.debug("Default topics created for whiteboard: {}", whiteboardId);
    }
}
