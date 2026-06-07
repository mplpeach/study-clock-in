package com.example.clockin.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Comment;

@Getter
@Setter
@Entity
@Comment("目标-任务关联表")
@Table(name = "goal_tasks", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"goal_id", "task_id"})
})
public class GoalTask extends BaseEntity {

    @Comment("目标ID")
    @Column(name = "goal_id", nullable = false)
    private Long goalId;

    @Comment("任务ID")
    @Column(name = "task_id", nullable = false)
    private Long taskId;
}
