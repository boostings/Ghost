package com.ghost.service;

import com.ghost.dto.response.TopicResponse;
import com.ghost.exception.BadRequestException;
import com.ghost.exception.ForbiddenException;
import com.ghost.mapper.TopicMapper;
import com.ghost.model.Topic;
import com.ghost.model.Whiteboard;
import com.ghost.model.WhiteboardMembership;
import com.ghost.model.enums.AuditAction;
import com.ghost.model.enums.Role;
import com.ghost.repository.TopicRepository;
import com.ghost.repository.WhiteboardMembershipRepository;
import com.ghost.repository.WhiteboardRepository;
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
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TopicServiceTest {

    @Mock
    private TopicRepository topicRepository;

    @Mock
    private WhiteboardRepository whiteboardRepository;

    @Mock
    private WhiteboardMembershipRepository whiteboardMembershipRepository;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private TopicMapper topicMapper;

    @InjectMocks
    private TopicService topicService;

    private UUID userId;
    private UUID whiteboardId;
    private Whiteboard whiteboard;
    private WhiteboardMembership facultyMembership;
    private WhiteboardMembership studentMembership;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        whiteboardId = UUID.randomUUID();
        whiteboard = Whiteboard.builder()
                .id(whiteboardId)
                .inviteCode("JOIN326")
                .build();
        facultyMembership = WhiteboardMembership.builder()
                .whiteboard(whiteboard)
                .role(Role.FACULTY)
                .build();
        studentMembership = WhiteboardMembership.builder()
                .whiteboard(whiteboard)
                .role(Role.STUDENT)
                .build();
    }

    @Test
    void getTopicsShouldRequireMembershipAndMapResponses() {
        Topic topic = Topic.builder()
                .id(UUID.randomUUID())
                .whiteboard(whiteboard)
                .name("Homework")
                .isDefault(true)
                .build();
        TopicResponse response = TopicResponse.builder()
                .id(topic.getId())
                .name("Homework")
                .isDefault(true)
                .build();

        when(whiteboardMembershipRepository.findByWhiteboardIdAndUserId(whiteboardId, userId))
                .thenReturn(Optional.of(studentMembership));
        when(topicRepository.findByWhiteboardIdOrderByNameAsc(eq(whiteboardId), any()))
                .thenReturn(new PageImpl<>(List.of(topic), PageRequest.of(0, 20), 1));
        when(topicMapper.toResponse(topic)).thenReturn(response);

        var page = topicService.getTopics(userId, whiteboardId, PageRequest.of(0, 20));

        verify(topicMapper).toResponse(topic);
        assertThat(page.getContent()).containsExactly(response);
    }

    @Test
    void createTopicShouldSaveAuditAndMapNewTopic() {
        Topic topic = Topic.builder()
                .id(UUID.randomUUID())
                .whiteboard(whiteboard)
                .name("Projects")
                .isDefault(false)
                .build();
        TopicResponse response = TopicResponse.builder()
                .id(topic.getId())
                .name("Projects")
                .isDefault(false)
                .build();

        when(whiteboardMembershipRepository.findByWhiteboardIdAndUserId(whiteboardId, userId))
                .thenReturn(Optional.of(facultyMembership));
        when(whiteboardRepository.findById(whiteboardId)).thenReturn(Optional.of(whiteboard));
        when(topicRepository.findByWhiteboardIdAndName(whiteboardId, "Projects")).thenReturn(Optional.empty());
        when(topicRepository.save(any(Topic.class))).thenReturn(topic);
        when(topicMapper.toResponse(topic)).thenReturn(response);

        TopicResponse created = topicService.createTopic(userId, whiteboardId, " Projects ");

        verify(topicRepository).save(any(Topic.class));
        verify(auditLogService).logAction(
                whiteboardId,
                userId,
                AuditAction.TOPIC_CREATED,
                "Topic",
                topic.getId(),
                null,
                "Projects"
        );
        assertThat(created).isEqualTo(response);
    }

    @Test
    void createTopicShouldRejectDuplicateTopicNames() {
        when(whiteboardMembershipRepository.findByWhiteboardIdAndUserId(whiteboardId, userId))
                .thenReturn(Optional.of(facultyMembership));
        when(whiteboardRepository.findById(whiteboardId)).thenReturn(Optional.of(whiteboard));
        when(topicRepository.findByWhiteboardIdAndName(whiteboardId, "Exam"))
                .thenReturn(Optional.of(Topic.builder().id(UUID.randomUUID()).build()));

        assertThatThrownBy(() -> topicService.createTopic(userId, whiteboardId, "Exam"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    void deleteTopicShouldRejectDefaultTopicsAndNonFacultyMembers() {
        Topic defaultTopic = Topic.builder()
                .id(UUID.randomUUID())
                .whiteboard(whiteboard)
                .name("Homework")
                .isDefault(true)
                .build();
        Topic customTopic = Topic.builder()
                .id(UUID.randomUUID())
                .whiteboard(whiteboard)
                .name("Projects")
                .isDefault(false)
                .build();

        when(topicRepository.findById(defaultTopic.getId())).thenReturn(Optional.of(defaultTopic));
        when(whiteboardMembershipRepository.findByWhiteboardIdAndUserId(whiteboardId, userId))
                .thenReturn(Optional.of(facultyMembership))
                .thenReturn(Optional.of(studentMembership));

        assertThatThrownBy(() -> topicService.deleteTopic(userId, whiteboardId, defaultTopic.getId()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Cannot delete default topics");

        when(topicRepository.findById(customTopic.getId())).thenReturn(Optional.of(customTopic));

        assertThatThrownBy(() -> topicService.deleteTopic(userId, whiteboardId, customTopic.getId()))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Only faculty members");
    }

    @Test
    void deleteTopicShouldDeleteCustomTopicsAndAudit() {
        Topic topic = Topic.builder()
                .id(UUID.randomUUID())
                .whiteboard(whiteboard)
                .name("Projects")
                .isDefault(false)
                .build();

        when(topicRepository.findById(topic.getId())).thenReturn(Optional.of(topic));
        when(whiteboardMembershipRepository.findByWhiteboardIdAndUserId(whiteboardId, userId))
                .thenReturn(Optional.of(facultyMembership));

        topicService.deleteTopic(userId, whiteboardId, topic.getId());

        verify(auditLogService).logAction(
                whiteboardId,
                userId,
                AuditAction.TOPIC_DELETED,
                "Topic",
                topic.getId(),
                "Projects",
                null
        );
        verify(topicRepository).delete(topic);
    }

    @Test
    void createDefaultTopicsShouldCreateAndAuditAllFourDefaults() {
        when(whiteboardRepository.findById(whiteboardId)).thenReturn(Optional.of(whiteboard));
        when(topicRepository.save(any(Topic.class))).thenAnswer(invocation -> {
            Topic topic = invocation.getArgument(0);
            topic.setId(UUID.randomUUID());
            return topic;
        });

        topicService.createDefaultTopics(whiteboardId, userId);

        verify(topicRepository, times(4)).save(any(Topic.class));
        verify(auditLogService, times(4)).logAction(
                eq(whiteboardId),
                eq(userId),
                eq(AuditAction.TOPIC_CREATED),
                eq("Topic"),
                any(UUID.class),
                eq(null),
                any(String.class)
        );
    }
}
