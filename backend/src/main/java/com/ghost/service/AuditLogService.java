package com.ghost.service;

import com.ghost.model.AuditLog;
import com.ghost.model.Whiteboard;
import com.ghost.model.User;
import com.ghost.model.enums.AuditAction;
import com.ghost.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Transactional
    public void logAction(UUID whiteboardId, UUID actorId, AuditAction action,
                          String targetType, UUID targetId, String oldValue, String newValue) {
        AuditLog auditLog = AuditLog.builder()
                .whiteboard(Whiteboard.builder().id(whiteboardId).build())
                .actor(User.builder().id(actorId).build())
                .action(action)
                .targetType(targetType)
                .targetId(targetId)
                .oldValue(oldValue)
                .newValue(newValue)
                .build();

        auditLogRepository.save(auditLog);
        log.debug("Audit log created: action={}, actor={}, target={}/{}", action, actorId, targetType, targetId);
    }

    @Transactional(readOnly = true)
    public Page<AuditLog> getAuditLogs(UUID whiteboardId, Pageable pageable) {
        return auditLogRepository.findByWhiteboardIdOrderByCreatedAtDesc(whiteboardId, pageable);
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
            csv.append(escapeCsv(entry.getTargetType() != null ? entry.getTargetType() : "")).append(",");
            csv.append(escapeCsv(entry.getTargetId() != null ? entry.getTargetId().toString() : "")).append(",");
            csv.append(escapeCsv(entry.getOldValue() != null ? entry.getOldValue() : "")).append(",");
            csv.append(escapeCsv(entry.getNewValue() != null ? entry.getNewValue() : ""));
            csv.append("\n");
        }

        return csv.toString();
    }

    private String escapeCsv(String value) {
        if (value == null) {
            return "";
        }
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}
