package com.example.clockin.entity;

import com.example.clockin.enums.TaskInstanceStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Comment;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@Comment("任务实例表")
@Table(name = "task_instances", indexes = {
    @Index(name = "idx_scheduled_date", columnList = "scheduledDate"),
    @Index(name = "idx_user_date", columnList = "userId, scheduledDate"),
    @Index(name = "idx_task_date", columnList = "taskId, scheduledDate")
})
public class TaskInstance extends BaseEntity {

    @Comment("任务定义ID")
    @Column(nullable = false)
    private Long taskId;

    @Comment("用户ID")
    @Column(nullable = false)
    private Long userId;

    @Comment("计划日期")
    @Column(nullable = false)
    private LocalDate scheduledDate;

    @Comment("实例状态(TODO/IN_PROGRESS/COMPLETED/SKIPPED/DEFERRED)")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, columnDefinition = "VARCHAR(20) DEFAULT 'TODO'")
    private TaskInstanceStatus status = TaskInstanceStatus.TODO;

    @Comment("延期次数")
    @Column(nullable = false)
    private Integer deferCount = 0;
}
