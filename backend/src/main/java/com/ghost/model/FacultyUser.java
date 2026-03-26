package com.ghost.model;

import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Entity
@DiscriminatorValue("FACULTY")
@SuperBuilder
@NoArgsConstructor
public class FacultyUser extends User {
}
