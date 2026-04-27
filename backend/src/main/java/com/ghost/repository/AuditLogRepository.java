package com.ghost.repository;

import com.ghost.model.AuditLog;
import com.ghost.model.enums.AuditAction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID>, JpaSpecificationExecutor<AuditLog> {

    Page<AuditLog> findByWhiteboardIdOrderByCreatedAtDesc(UUID whiteboardId, Pageable pageable);

    Page<AuditLog> findByWhiteboardIdAndAction(UUID whiteboardId, AuditAction action, Pageable pageable);

    List<AuditLog> findByWhiteboardIdOrderByCreatedAtDesc(UUID whiteboardId);
}
