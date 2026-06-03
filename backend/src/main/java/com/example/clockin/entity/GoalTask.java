package com.example.clockin.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "goal_tasks", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"goal_id", "task_id"})
})
public class GoalTask extends BaseEntity {

    @Column(name = "goal_id", nullable = false)
    private Long goalId;

    @Column(name = "task_id", nullable = false)
    private Long taskId;
}
