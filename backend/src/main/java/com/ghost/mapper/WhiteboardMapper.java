package com.ghost.mapper;

import com.ghost.dto.response.WhiteboardResponse;
import com.ghost.model.User;
import com.ghost.model.Whiteboard;
import com.ghost.repository.WhiteboardMembershipRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class WhiteboardMapper {

    private final WhiteboardMembershipRepository whiteboardMembershipRepository;

    public WhiteboardResponse toResponse(Whiteboard whiteboard, boolean includeInviteCode) {
        User owner = whiteboard.getOwner();
        return WhiteboardResponse.builder()
                .id(whiteboard.getId())
                .courseCode(whiteboard.getCourseCode())
                .courseName(whiteboard.getCourseName())
                .section(whiteboard.getSection())
                .semester(whiteboard.getSemester())
                .ownerId(owner.getId())
                .ownerName(owner.getFirstName() + " " + owner.getLastName())
                .inviteCode(includeInviteCode ? whiteboard.getInviteCode() : null)
                .isDemo(whiteboard.isDemo())
                .memberCount(whiteboardMembershipRepository.countByWhiteboardId(whiteboard.getId()))
                .createdAt(whiteboard.getCreatedAt())
                .build();
    }
}
