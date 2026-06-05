package com.example.clockin.entity;

import com.example.clockin.enums.ActionType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "task_instance_actions")
public class TaskInstanceAction extends BaseEntity {

    @Column(nullable = false)
    private Long taskInstanceId;

    @Column(nullable = false)
    private Long taskId;

    @Column(nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private ActionType actionType;

    private LocalDate originalDate;

    private LocalDate newDate;
}
