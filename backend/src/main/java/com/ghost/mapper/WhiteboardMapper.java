package com.ghost.mapper;

import com.ghost.dto.response.WhiteboardResponse;
import com.ghost.model.Course;
import com.ghost.model.Semester;
import com.ghost.model.User;
import com.ghost.model.Whiteboard;
import com.ghost.model.enums.Role;
import org.springframework.stereotype.Component;

@Component
public class WhiteboardMapper {

    public WhiteboardResponse toResponse(
            Whiteboard whiteboard,
            long memberCount,
            boolean includeInviteCode,
            Role myRole
    ) {
        User owner = whiteboard.getOwner();
        Course course = whiteboard.getCourse();
        Semester semester = whiteboard.getSemester();
        return WhiteboardResponse.builder()
                .id(whiteboard.getId())
                .courseCode(course.getCourseCode())
                .courseName(course.getCourseName())
                .section(course.getSection())
                .semester(semester.getName())
                .ownerId(owner.getId())
                .ownerName(owner.getFirstName() + " " + owner.getLastName())
                .inviteCode(includeInviteCode ? whiteboard.getInviteCode() : null)
                .isDemo(whiteboard.isDemo())
                .memberCount((int) memberCount)
                .createdAt(whiteboard.getCreatedAt())
                .myRole(myRole)
                .build();
    }
}
