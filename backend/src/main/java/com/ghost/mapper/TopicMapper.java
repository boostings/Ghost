package com.ghost.mapper;

import com.ghost.dto.response.TopicResponse;
import com.ghost.model.Topic;
import org.springframework.stereotype.Component;

@Component
public class TopicMapper {

    public TopicResponse toResponse(Topic topic) {
        return TopicResponse.builder()
                .id(topic.getId())
                .name(topic.getName())
                .isDefault(topic.isDefault())
                .build();
    }
}
