package com.ghost.controller;

import com.ghost.dto.response.AuditLogResponse;
import com.ghost.dto.response.PageResponse;
import com.ghost.exception.BadRequestException;
import com.ghost.service.AuditLogService;
import com.ghost.service.WhiteboardService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuditLogControllerTest {

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private WhiteboardService whiteboardService;

    @InjectMocks
    private AuditLogController auditLogController;

    @Test
    void getAuditLogsShouldRejectUnknownAction() {
        UUID wbId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        assertThatThrownBy(() -> auditLogController.getAuditLogs(
                userId.toString(),
                wbId,
                0,
                20,
                "not_real",
                null,
                null,
                null
        ))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Invalid audit action");
    }

    @Test
    void getAuditLogsShouldClampPageSizeToMax100() {
        UUID wbId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Page<AuditLogResponse> page = new PageImpl<>(List.of(AuditLogResponse.builder().build()));
        when(auditLogService.getAuditLogs(any(), any(), isNull(), isNull(), isNull(), isNull())).thenReturn(page);

        ResponseEntity<PageResponse<AuditLogResponse>> response = auditLogController.getAuditLogs(
                userId.toString(),
                wbId,
                0,
                1000,
                null,
                null,
                null,
                null
        );

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(whiteboardService).verifyFacultyRole(userId, wbId);
        verify(auditLogService).getAuditLogs(any(), pageableCaptor.capture(), isNull(), isNull(), isNull(), isNull());
        assertThat(pageableCaptor.getValue().getPageSize()).isEqualTo(100);
        assertThat(pageableCaptor.getValue().getSort().getOrderFor("createdAt")).isNotNull();
        assertThat(pageableCaptor.getValue().getSort().getOrderFor("createdAt").isDescending()).isTrue();
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getContent()).hasSize(1);
    }
}
