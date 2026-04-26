package com.ghost.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class AlgoliaCourseFinderClient implements CourseFinderClient {

    private static final int HITS_PER_PAGE = 1000;

    private final RestClient.Builder restClientBuilder;

    @Value("${course-finder.algolia.app-id:BUULYNE5G7}")
    private String appId;

    @Value("${course-finder.algolia.api-key:bcebc98a4b5c10e4c62245f43ddabe9b}")
    private String apiKey;

    @Value("${course-finder.algolia.index-name:coursefinder-prod}")
    private String indexName;

    @Override
    public List<CourseFinderSection> fetchSections(String term) {
        AlgoliaSearchResponse termSummary = query(term, List.of(), 0, 0, List.of("subject"));
        if (termSummary != null && termSummary.nbHits() > HITS_PER_PAGE) {
            return fetchSectionsBySubject(term, termSummary);
        }
        return fetchSections(term, List.of());
    }

    private List<CourseFinderSection> fetchSectionsBySubject(String term, AlgoliaSearchResponse termSummary) {
        Map<String, Integer> subjectCounts = termSummary.facets() == null
                ? Map.of()
                : termSummary.facets().getOrDefault("subject", Map.of());

        return subjectCounts.entrySet().stream()
                .sorted(Comparator.comparing(Map.Entry<String, Integer>::getKey))
                .flatMap(entry -> fetchSections(term, List.of("subject:" + entry.getKey())).stream())
                .toList();
    }

    private List<CourseFinderSection> fetchSections(String term, List<String> extraFilters) {
        List<CourseFinderSection> sections = new ArrayList<>();
        int page = 0;
        int totalPages = 1;

        while (page < totalPages) {
            AlgoliaSearchResponse response = query(term, extraFilters, page, HITS_PER_PAGE, List.of());
            if (response == null || response.hits() == null) {
                break;
            }
            sections.addAll(response.hits().stream()
                    .map(this::toSection)
                    .toList());
            totalPages = Math.max(response.nbPages(), 0);
            page++;
        }

        return sections;
    }

    private AlgoliaSearchResponse query(
            String term,
            List<String> extraFilters,
            int page,
            int hitsPerPage,
            List<String> facets
    ) {
        String url = "https://" + appId + "-dsn.algolia.net/1/indexes/" + indexName + "/query";
        List<List<String>> facetFilters = new ArrayList<>();
        facetFilters.add(List.of("term:" + term));
        extraFilters.forEach(filter -> facetFilters.add(List.of(filter)));

        Map<String, Object> request = Map.of(
                "query", "",
                "hitsPerPage", hitsPerPage,
                "page", page,
                "facetFilters", facetFilters,
                "facets", facets,
                "maxValuesPerFacet", 1000
        );

        return restClientBuilder.build()
                .post()
                .uri(url)
                .header("x-algolia-application-id", appId)
                .header("x-algolia-api-key", apiKey)
                .body(request)
                .retrieve()
                .body(AlgoliaSearchResponse.class);
    }

    private CourseFinderSection toSection(AlgoliaHit hit) {
        return CourseFinderSection.builder()
                .sourceObjectId(hit.objectID())
                .sourceCourseId(hit.courseID())
                .subject(hit.subject())
                .catalogNumber(hit.catalogNumber())
                .courseTitle(hit.courseTitle())
                .courseDescription(hit.courseDescription())
                .departmentName(hit.departmentName())
                .credit(hit.credit())
                .term(hit.term())
                .termId(hit.termId())
                .section(hit.section() == null ? null : hit.section().toString())
                .classNumber(hit.classNumber())
                .instructor(hit.instructor())
                .session(hit.session())
                .career(hit.career())
                .instructionMode(hit.instructionMode())
                .meetingPattern(hit.meetingPattern())
                .meetingTimes(hit.meetingTimes())
                .numberOfWeeks(hit.numberOfWeeks())
                .openSection(hit.openSection())
                .lowCostMaterialsSection(hit.lowCostMaterialsSection())
                .noCostMaterialsSection(hit.noCostMaterialsSection())
                .build();
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record AlgoliaSearchResponse(
            List<AlgoliaHit> hits,
            int nbPages,
            int nbHits,
            Map<String, Map<String, Integer>> facets
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record AlgoliaHit(
            String objectID,
            String courseID,
            String subject,
            String catalogNumber,
            String courseTitle,
            String courseDescription,
            String departmentName,
            String credit,
            String term,
            String termId,
            Object section,
            String classNumber,
            String instructor,
            String session,
            String career,
            String instructionMode,
            List<String> meetingPattern,
            List<String> meetingTimes,
            Integer numberOfWeeks,
            @JsonProperty("isOpenSection") boolean openSection,
            @JsonProperty("isLowCostMaterialsSection") boolean lowCostMaterialsSection,
            @JsonProperty("isNoCostMaterialsSection") boolean noCostMaterialsSection
    ) {
    }
}
