package com.ghost.util;

import com.ghost.model.Comment;

import java.time.Duration;
import java.time.LocalDateTime;

public final class CommentEditPolicy {

    public static final Duration EDIT_WINDOW = Duration.ofHours(1);

    private CommentEditPolicy() {
    }

    public static LocalDateTime deadlineFrom(LocalDateTime createdAt) {
        return createdAt.plus(EDIT_WINDOW);
    }

    public static boolean isEditable(Comment comment, LocalDateTime now) {
        LocalDateTime deadline = comment.getCreatedAt() != null
                ? deadlineFrom(comment.getCreatedAt())
                : comment.getEditDeadline();
        return deadline != null && deadline.isAfter(now);
    }
}
