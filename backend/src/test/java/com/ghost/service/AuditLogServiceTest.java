package com.ghost.service;

import com.ghost.dto.response.AuditLogResponse;
import com.ghost.exception.BadRequestException;
import com.ghost.mapper.AuditLogMapper;
import com.ghost.model.AuditLog;
import com.ghost.model.enums.AuditAction;
import com.ghost.repository.AuditLogRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuditLogServiceTest {

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private AuditLogMapper auditLogMapper;

    @InjectMocks
    private AuditLogService auditLogService;

    @Test
    void getAuditLogsShouldApplyAllFilters() {
        UUID whiteboardId = UUID.randomUUID();
        UUID actorId = UUID.randomUUID();
        Pageable pageable = PageRequest.of(0, 20);
        LocalDateTime startAt = LocalDateTime.now().minusDays(7);
        LocalDateTime endAt = LocalDateTime.now();

        AuditLog auditLog = AuditLog.builder()
                .id(UUID.randomUUID())
                .action(AuditAction.REPORT_SUBMITTED)
                .build();
        AuditLogResponse response = AuditLogResponse.builder()
                .id(auditLog.getId())
                .action(AuditAction.REPORT_SUBMITTED)
                .build();

        when(auditLogRepository.findByFilters(
                eq(whiteboardId),
                eq(AuditAction.REPORT_SUBMITTED),
                eq(actorId),
                eq(startAt),
                eq(endAt),
                eq(pageable)
        )).thenReturn(new PageImpl<>(List.of(auditLog), pageable, 1));
        when(auditLogMapper.toResponse(auditLog)).thenReturn(response);

        auditLogService.getAuditLogs(
                whiteboardId,
                pageable,
                AuditAction.REPORT_SUBMITTED,
                actorId,
                startAt,
                endAt
        );

        verify(auditLogRepository).findByFilters(
                whiteboardId,
                AuditAction.REPORT_SUBMITTED,
                actorId,
                startAt,
                endAt,
                pageable
        );
        verify(auditLogMapper).toResponse(auditLog);
    }

    @Test
    void getAuditLogsShouldRejectInvalidDateRange() {
        UUID whiteboardId = UUID.randomUUID();
        Pageable pageable = PageRequest.of(0, 20);
        LocalDateTime startAt = LocalDateTime.now();
        LocalDateTime endAt = startAt.minusHours(1);

        assertThatThrownBy(() -> auditLogService.getAuditLogs(
                whiteboardId,
                pageable,
                null,
                null,
                startAt,
                endAt
        ))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("startAt must be before endAt");

        verify(auditLogRepository, never()).findByFilters(
                whiteboardId,
                null,
                null,
                startAt,
                endAt,
                pageable
        );
    }
}
