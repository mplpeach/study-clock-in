package com.example.clockin.entity;

import com.example.clockin.enums.RepeatRule;
import com.example.clockin.enums.TaskStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Comment;

import java.time.LocalDate;

@Getter
@Setter
@Entity
@Comment("任务表")
@Table(name = "tasks")
public class Task extends BaseEntity {

    @Comment("任务名称")
    @Column(nullable = false, length = 200)
    private String name;

    @Comment("任务描述")
    @Column(columnDefinition = "TEXT")
    private String description;

    @Comment("用户ID")
    @Column(nullable = false)
    private Long userId;

    @Comment("计划日期")
    private LocalDate scheduledDate;

    @Comment("重复规则(NONE/DAILY/WEEKLY)")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, columnDefinition = "VARCHAR(20)")
    private RepeatRule repeatRule = RepeatRule.NONE;

    @Comment("每周重复日")
    @Column(length = 20)
    private String weeklyDays;

    @Comment("任务状态(ACTIVE/COMPLETED)")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, columnDefinition = "VARCHAR(20)")
    private TaskStatus status = TaskStatus.ACTIVE;
}
