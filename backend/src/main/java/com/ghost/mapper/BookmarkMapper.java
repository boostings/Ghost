package com.ghost.mapper;

import com.ghost.dto.response.BookmarkResponse;
import com.ghost.model.Bookmark;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class BookmarkMapper {

    private final QuestionMapper questionMapper;

    public BookmarkResponse toResponse(Bookmark bookmark, UUID currentUserId, boolean includeModerationData) {
        return BookmarkResponse.builder()
                .id(bookmark.getId())
                .question(questionMapper.toResponse(bookmark.getQuestion(), currentUserId, includeModerationData))
                .createdAt(bookmark.getCreatedAt())
                .build();
    }
}
