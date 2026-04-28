package com.ghost.repository;

import com.ghost.model.Whiteboard;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WhiteboardRepository extends JpaRepository<Whiteboard, UUID> {

    Optional<Whiteboard> findByCourseCourseCodeAndCourseSectionAndSemesterName(
            String courseCode,
            String section,
            String semesterName
    );

    Optional<Whiteboard> findByInviteCode(String inviteCode);

    Optional<Whiteboard> findByInviteCodeIgnoreCase(String inviteCode);

    Optional<Whiteboard> findFirstByIsDemoTrueOrderByCreatedAtAsc();

    boolean existsByInviteCode(String inviteCode);

    boolean existsByInviteCodeIgnoreCase(String inviteCode);

    List<Whiteboard> findByOwnerId(UUID ownerId);

    @Query("""
            select w
            from Whiteboard w
            where not exists (
                select 1
                from WhiteboardMembership m
                where m.whiteboard = w and m.user.id = :userId
            )
            order by w.createdAt desc
            """)
    Page<Whiteboard> findDiscoverableForUser(@Param("userId") UUID userId, Pageable pageable);
}
