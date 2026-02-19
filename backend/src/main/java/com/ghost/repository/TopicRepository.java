package com.ghost.repository;

import com.ghost.model.Topic;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TopicRepository extends JpaRepository<Topic, UUID> {

    List<Topic> findByWhiteboardId(UUID whiteboardId);

    Page<Topic> findByWhiteboardIdOrderByNameAsc(UUID whiteboardId, Pageable pageable);

    Optional<Topic> findByWhiteboardIdAndName(UUID whiteboardId, String name);

    Optional<Topic> findByIdAndWhiteboardId(UUID id, UUID whiteboardId);
}
