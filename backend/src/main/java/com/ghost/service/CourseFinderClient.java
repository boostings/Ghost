package com.ghost.service;

import java.util.List;

public interface CourseFinderClient {

    List<CourseFinderSection> fetchSections(String term);
}
