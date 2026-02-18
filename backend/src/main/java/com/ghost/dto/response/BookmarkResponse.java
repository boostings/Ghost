package com.ghost.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookmarkResponse {

    private UUID id;

    private QuestionResponse question;

    private LocalDateTime createdAt;
}
