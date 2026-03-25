package com.ghost.service;

import com.ghost.model.Semester;
import com.ghost.repository.SemesterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SemesterService {

    private final SemesterRepository semesterRepository;

    @Transactional
    public Semester findOrCreate(String semesterName) {
        return semesterRepository.findByName(semesterName)
                .orElseGet(() -> semesterRepository.save(Semester.builder()
                        .name(semesterName)
                        .build()));
    }
}
