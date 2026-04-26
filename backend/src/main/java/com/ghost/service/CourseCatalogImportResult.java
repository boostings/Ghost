package com.ghost.service;

import java.util.List;

public record CourseCatalogImportResult(
        List<String> allowedTerms,
        int sectionsImported
) {
}
