package com.ghost.service;

import com.ghost.model.Question;
import com.ghost.model.enums.QuestionStatus;
import com.ghost.repository.QuestionRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SearchService {

    private final QuestionRepository questionRepository;

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional(readOnly = true)
    public Page<Question> search(String query, UUID whiteboardId, UUID topicId,
                                  String status, Pageable pageable) {
        // If a full-text search query is provided and only whiteboardId filter,
        // use the native full-text search
        if (query != null && !query.isBlank() && whiteboardId != null
                && topicId == null && status == null) {
            return questionRepository.searchByWhiteboardId(whiteboardId, query.trim(), pageable);
        }

        // Otherwise, build a dynamic query using JPA Criteria API
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Question> cq = cb.createQuery(Question.class);
        Root<Question> root = cq.from(Question.class);

        List<Predicate> predicates = new ArrayList<>();

        // Always exclude hidden questions
        predicates.add(cb.isFalse(root.get("isHidden")));

        if (whiteboardId != null) {
            predicates.add(cb.equal(root.get("whiteboard").get("id"), whiteboardId));
        }

        if (topicId != null) {
            predicates.add(cb.equal(root.get("topic").get("id"), topicId));
        }

        if (status != null && !status.isBlank()) {
            try {
                QuestionStatus questionStatus = QuestionStatus.valueOf(status.toUpperCase());
                predicates.add(cb.equal(root.get("status"), questionStatus));
            } catch (IllegalArgumentException e) {
                log.warn("Invalid status filter: {}", status);
            }
        }

        if (query != null && !query.isBlank()) {
            String likePattern = "%" + query.trim().toLowerCase() + "%";
            Predicate titleMatch = cb.like(cb.lower(root.get("title")), likePattern);
            Predicate bodyMatch = cb.like(cb.lower(root.get("body")), likePattern);
            predicates.add(cb.or(titleMatch, bodyMatch));
        }

        cq.where(predicates.toArray(new Predicate[0]));
        cq.orderBy(
                cb.desc(root.get("isPinned")),
                cb.desc(root.get("createdAt"))
        );

        // Count query
        CriteriaQuery<Long> countQuery = cb.createQuery(Long.class);
        Root<Question> countRoot = countQuery.from(Question.class);
        List<Predicate> countPredicates = new ArrayList<>();

        countPredicates.add(cb.isFalse(countRoot.get("isHidden")));

        if (whiteboardId != null) {
            countPredicates.add(cb.equal(countRoot.get("whiteboard").get("id"), whiteboardId));
        }
        if (topicId != null) {
            countPredicates.add(cb.equal(countRoot.get("topic").get("id"), topicId));
        }
        if (status != null && !status.isBlank()) {
            try {
                QuestionStatus questionStatus = QuestionStatus.valueOf(status.toUpperCase());
                countPredicates.add(cb.equal(countRoot.get("status"), questionStatus));
            } catch (IllegalArgumentException e) {
                // Already logged above
            }
        }
        if (query != null && !query.isBlank()) {
            String likePattern = "%" + query.trim().toLowerCase() + "%";
            Predicate titleMatch = cb.like(cb.lower(countRoot.get("title")), likePattern);
            Predicate bodyMatch = cb.like(cb.lower(countRoot.get("body")), likePattern);
            countPredicates.add(cb.or(titleMatch, bodyMatch));
        }

        countQuery.select(cb.count(countRoot));
        countQuery.where(countPredicates.toArray(new Predicate[0]));
        Long totalCount = entityManager.createQuery(countQuery).getSingleResult();

        // Execute paginated query
        TypedQuery<Question> typedQuery = entityManager.createQuery(cq);
        typedQuery.setFirstResult((int) pageable.getOffset());
        typedQuery.setMaxResults(pageable.getPageSize());

        List<Question> results = typedQuery.getResultList();

        return new PageImpl<>(results, pageable, totalCount);
    }
}
