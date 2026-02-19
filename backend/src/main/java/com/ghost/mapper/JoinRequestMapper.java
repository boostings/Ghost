package com.ghost.mapper;

import com.ghost.dto.response.JoinRequestResponse;
import com.ghost.model.JoinRequest;
import com.ghost.model.User;
import org.springframework.stereotype.Component;

@Component
public class JoinRequestMapper {

    public JoinRequestResponse toResponse(JoinRequest joinRequest) {
        User user = joinRequest.getUser();
        return JoinRequestResponse.builder()
                .id(joinRequest.getId())
                .userId(user.getId())
                .userName(user.getFirstName() + " " + user.getLastName())
                .userEmail(user.getEmail())
                .whiteboardId(joinRequest.getWhiteboard().getId())
                .status(joinRequest.getStatus())
                .createdAt(joinRequest.getCreatedAt())
                .build();
    }
}
