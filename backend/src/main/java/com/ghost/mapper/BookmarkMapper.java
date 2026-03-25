package com.ghost.mapper;

import com.ghost.dto.response.BookmarkResponse;
import com.ghost.dto.response.QuestionResponse;
import com.ghost.model.Bookmark;
import org.springframework.stereotype.Component;

@Component
public class BookmarkMapper {

    public BookmarkResponse toResponse(Bookmark bookmark, QuestionResponse question) {
        return BookmarkResponse.builder()
                .id(bookmark.getId())
                .question(question)
                .createdAt(bookmark.getCreatedAt())
                .build();
    }
}
