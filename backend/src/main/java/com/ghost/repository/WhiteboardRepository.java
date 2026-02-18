package com.ghost.repository;

import com.ghost.model.Whiteboard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WhiteboardRepository extends JpaRepository<Whiteboard, UUID> {

    Optional<Whiteboard> findByCourseCodeAndSemester(String courseCode, String semester);

    Optional<Whiteboard> findByInviteCode(String inviteCode);

    List<Whiteboard> findByOwnerId(UUID ownerId);
}
