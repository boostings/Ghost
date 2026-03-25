package com.ghost.service;

import com.ghost.dto.response.WhiteboardResponse;
import com.ghost.mapper.WhiteboardMapper;
import com.ghost.model.Whiteboard;
import com.ghost.repository.WhiteboardMembershipRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WhiteboardResponseAssembler {

    private final WhiteboardMembershipRepository whiteboardMembershipRepository;
    private final WhiteboardMapper whiteboardMapper;

    @Transactional(readOnly = true)
    public WhiteboardResponse toResponse(Whiteboard whiteboard, boolean includeInviteCode) {
        long memberCount = whiteboardMembershipRepository.countByWhiteboardId(whiteboard.getId());
        return whiteboardMapper.toResponse(whiteboard, memberCount, includeInviteCode);
    }
}
