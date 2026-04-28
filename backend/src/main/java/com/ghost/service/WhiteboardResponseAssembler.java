package com.ghost.service;

import com.ghost.dto.response.WhiteboardResponse;
import com.ghost.mapper.WhiteboardMapper;
import com.ghost.model.Whiteboard;
import com.ghost.model.enums.Role;
import com.ghost.repository.WhiteboardMembershipRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WhiteboardResponseAssembler {

    private final WhiteboardMembershipRepository whiteboardMembershipRepository;
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
        return whiteboardMapper.toResponse(whiteboard, memberCount, includeInviteCode, myRole);
    }
}
