package com.ghost.repository;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.repository.Query;

import java.lang.reflect.Method;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;

class RepositoryQueryContractTest {

    @Test
    void questionRepositoryShouldExposeSearchQueries() throws Exception {
        Method searchByWhiteboardId = QuestionRepository.class.getMethod(
                "searchByWhiteboardId",
                java.util.UUID.class,
                String.class,
                org.springframework.data.domain.Pageable.class
        );
        Method searchWithFilters = QuestionRepository.class.getMethod(
                "searchWithFilters",
                java.util.List.class,
                String.class,
                java.util.UUID.class,
                String.class,
                java.time.LocalDateTime.class,
                java.time.LocalDateTime.class,
                org.springframework.data.domain.Pageable.class
        );

        assertThat(searchByWhiteboardId.getAnnotation(Query.class)).isNotNull();
        Query searchWithFiltersQuery = searchWithFilters.getAnnotation(Query.class);
        assertThat(searchWithFiltersQuery).isNotNull();
        assertThat(Page.class.isAssignableFrom(searchByWhiteboardId.getReturnType())).isTrue();
        assertThat(Page.class.isAssignableFrom(searchWithFilters.getReturnType())).isTrue();
        assertThat(searchWithFiltersQuery.value())
                .contains("CAST(:startAt AS timestamp)")
                .contains("CAST(:endAt AS timestamp)");
    }

    @Test
    void reportRepositoryShouldExposeWhiteboardQueries() {
        boolean hasPagedWhiteboardQuery = Arrays.stream(ReportRepository.class.getMethods())
                .anyMatch(method -> method.getName().equals("findByWhiteboardIdPaged")
                        && method.getAnnotation(Query.class) != null
                        && Page.class.isAssignableFrom(method.getReturnType()));

        assertThat(hasPagedWhiteboardQuery).isTrue();
    }
}
