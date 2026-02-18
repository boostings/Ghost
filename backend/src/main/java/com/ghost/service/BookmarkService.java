package com.ghost.service;

import com.ghost.exception.BadRequestException;
import com.ghost.exception.ResourceNotFoundException;
import com.ghost.model.Bookmark;
import com.ghost.model.Question;
import com.ghost.model.User;
import com.ghost.repository.BookmarkRepository;
import com.ghost.repository.QuestionRepository;
import com.ghost.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookmarkService {

    private final BookmarkRepository bookmarkRepository;
    private final QuestionRepository questionRepository;
    private final UserRepository userRepository;

    @Transactional
    public Bookmark bookmark(UUID userId, UUID questionId) {
        // Check if already bookmarked
        if (bookmarkRepository.existsByUserIdAndQuestionId(userId, questionId)) {
            throw new BadRequestException("Question is already bookmarked");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new ResourceNotFoundException("Question", "id", questionId));

        Bookmark bookmark = Bookmark.builder()
                .user(user)
                .question(question)
                .build();

        return bookmarkRepository.save(bookmark);
    }

    @Transactional
    public void removeBookmark(UUID userId, UUID questionId) {
        Bookmark bookmark = bookmarkRepository.findByUserIdAndQuestionId(userId, questionId)
                .orElseThrow(() -> new ResourceNotFoundException("Bookmark", "questionId", questionId));

        bookmarkRepository.delete(bookmark);
    }

    @Transactional(readOnly = true)
    public List<Bookmark> getBookmarks(UUID userId) {
        return bookmarkRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public boolean isBookmarked(UUID userId, UUID questionId) {
        return bookmarkRepository.existsByUserIdAndQuestionId(userId, questionId);
    }
}
