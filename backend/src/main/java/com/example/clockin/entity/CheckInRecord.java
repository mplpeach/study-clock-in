package com.example.clockin.entity;

import com.example.clockin.enums.CheckInType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "check_in_records", indexes = {
    @Index(name = "idx_task_instance", columnList = "taskInstanceId"),
    @Index(name = "idx_user_time", columnList = "userId, startTime")
})
public class CheckInRecord extends BaseEntity {

    @Column(nullable = false)
    private Long taskInstanceId;

    @Column(nullable = false)
    private Long userId;

    private LocalDateTime startTime;

    private LocalDateTime endTime;

    private Integer durationMinutes;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, columnDefinition = "VARCHAR(20)")
    private CheckInType checkInType;
}
