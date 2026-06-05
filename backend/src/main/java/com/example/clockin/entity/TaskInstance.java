package com.example.clockin.entity;

import com.example.clockin.enums.TaskInstanceStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "task_instances", indexes = {
    @Index(name = "idx_scheduled_date", columnList = "scheduledDate"),
    @Index(name = "idx_user_date", columnList = "userId, scheduledDate"),
    @Index(name = "idx_task_date", columnList = "taskId, scheduledDate")
})
public class TaskInstance extends BaseEntity {

    @Column(nullable = false)
    private Long taskId;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private LocalDate scheduledDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TaskInstanceStatus status = TaskInstanceStatus.TODO;

    @Column(nullable = false)
    private Integer deferCount = 0;
}
