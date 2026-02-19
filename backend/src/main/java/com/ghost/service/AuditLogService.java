package com.ghost.service;

import com.ghost.dto.response.AuditLogResponse;
import com.ghost.mapper.AuditLogMapper;
import com.ghost.exception.BadRequestException;
import com.ghost.model.AuditLog;
import com.ghost.model.User;
import com.ghost.model.Whiteboard;
import com.ghost.model.enums.AuditAction;
import com.ghost.model.enums.AuditTargetType;
import com.ghost.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final AuditLogMapper auditLogMapper;

    @Transactional
    public void logAction(UUID whiteboardId, UUID actorId, AuditAction action,
                          String targetType, UUID targetId, String oldValue, String newValue) {
        AuditLog auditLog = AuditLog.builder()
                .whiteboard(whiteboardId == null ? null : Whiteboard.builder().id(whiteboardId).build())
                .actor(User.builder().id(actorId).build())
                .action(action)
                .targetType(AuditTargetType.from(targetType))
                .targetId(targetId)
                .oldValue(oldValue)
                .newValue(newValue)
                .build();

        auditLogRepository.save(auditLog);
        log.debug("Audit log created: action={}, actor={}, target={}/{}", action, actorId, targetType, targetId);
    }

    @Transactional(readOnly = true)
    public Page<AuditLogResponse> getAuditLogs(
            UUID whiteboardId,
            Pageable pageable,
            AuditAction action,
            UUID actorId,
            LocalDateTime startAt,
            LocalDateTime endAt
    ) {
        if (startAt != null && endAt != null && startAt.isAfter(endAt)) {
            throw new BadRequestException("startAt must be before endAt");
        }

        Page<AuditLog> page = auditLogRepository.findByFilters(
                whiteboardId,
                action,
                actorId,
                startAt,
                endAt,
                pageable
        );
        return page.map(auditLogMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getAuditLogsForExport(UUID whiteboardId) {
        return auditLogRepository.findByWhiteboardIdOrderByCreatedAtDesc(whiteboardId);
    }

    @Transactional(readOnly = true)
    public String exportToCsv(UUID whiteboardId) {
        List<AuditLog> logs = getAuditLogsForExport(whiteboardId);
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

        StringBuilder csv = new StringBuilder();
        csv.append("ID,Timestamp,Actor ID,Action,Target Type,Target ID,Old Value,New Value\n");

        for (AuditLog entry : logs) {
            csv.append(escapeCsv(entry.getId().toString())).append(",");
            csv.append(escapeCsv(entry.getCreatedAt() != null ? entry.getCreatedAt().format(formatter) : "")).append(",");
            csv.append(escapeCsv(entry.getActor() != null ? entry.getActor().getId().toString() : "")).append(",");
            csv.append(escapeCsv(entry.getAction().name())).append(",");
            csv.append(escapeCsv(entry.getTargetType() != null ? entry.getTargetType().name() : "")).append(",");
            csv.append(escapeCsv(entry.getTargetId() != null ? entry.getTargetId().toString() : "")).append(",");
            csv.append(escapeCsv(auditLogMapper.redactSensitive(entry.getOldValue() != null ? entry.getOldValue() : ""))).append(",");
            csv.append(escapeCsv(auditLogMapper.redactSensitive(entry.getNewValue() != null ? entry.getNewValue() : "")));
            csv.append("\n");
        }

        return csv.toString();
    }

    private String escapeCsv(String value) {
        if (value == null) {
            return "";
        }
        if (!value.isEmpty()) {
            char leading = value.charAt(0);
            if (leading == '=' || leading == '+' || leading == '-' || leading == '@') {
                value = "'" + value;
            }
        }
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}
