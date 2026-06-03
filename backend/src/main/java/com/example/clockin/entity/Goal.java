package com.example.clockin.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.util.Set;

@Getter
@Setter
@Entity
@Table(name = "goals")
public class Goal extends BaseEntity {

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 7)
    private String color;

    @Column(nullable = false)
    private Integer sortOrder = 0;

    @Column(nullable = false)
    private Long userId;
}
