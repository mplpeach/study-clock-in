package com.example.clockin.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "check_in_images")
public class CheckInImage extends BaseEntity {

    @Column(nullable = false)
    private Long recordId;

    @Column(nullable = false, length = 500)
    private String filePath;

    @Column(length = 200)
    private String fileName;

    private Long fileSize;
}
