package com.ghost.service;

import com.ghost.dto.response.WhiteboardResponse;
import com.ghost.mapper.WhiteboardMapper;
import com.ghost.model.Whiteboard;
import com.ghost.model.enums.Role;
import com.ghost.repository.CourseSectionRepository;
import com.ghost.repository.WhiteboardMembershipRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WhiteboardResponseAssembler {

    private final WhiteboardMembershipRepository whiteboardMembershipRepository;
    private final CourseSectionRepository courseSectionRepository;
    private final WhiteboardMapper whiteboardMapper;

    @Transactional(readOnly = true)
    public WhiteboardResponse toResponse(Whiteboard whiteboard, boolean includeInviteCode) {
        return toResponse(whiteboard, includeInviteCode, null);
    }

    @Transactional(readOnly = true)
    public WhiteboardResponse toResponse(Whiteboard whiteboard, boolean includeInviteCode, UUID viewerId) {
        long memberCount = whiteboardMembershipRepository.countByWhiteboardId(whiteboard.getId());
        Role myRole = viewerId == null
                ? null
                : whiteboardMembershipRepository
                        .findByWhiteboardIdAndUserId(whiteboard.getId(), viewerId)
                        .map(m -> m.getRole())
                        .orElse(null);
        long sectionCount = courseSectionRepository.countByCourseIdAndSemesterId(
                whiteboard.getCourse().getId(),
                whiteboard.getSemester().getId()
        );
        String instructorSummary = summarizeInstructors(
                courseSectionRepository.findDistinctInstructors(
                        whiteboard.getCourse().getId(),
                        whiteboard.getSemester().getId()
                )
        );
        return whiteboardMapper.toResponse(
                whiteboard,
                memberCount,
                sectionCount,
                instructorSummary,
                includeInviteCode,
                myRole
        );
    }

    private String summarizeInstructors(List<String> instructors) {
        if (instructors == null || instructors.isEmpty()) {
            return null;
        }
        String first = instructors.get(0).trim();
        int others = instructors.size() - 1;
        return others > 0 ? first + " + " + others + " others" : first;
    }
}
