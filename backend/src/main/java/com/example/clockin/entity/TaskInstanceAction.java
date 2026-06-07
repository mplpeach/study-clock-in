package com.example.clockin.entity;

import com.example.clockin.enums.ActionType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Comment;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@Comment("任务实例操作记录表")
@Table(name = "task_instance_actions")
public class TaskInstanceAction extends BaseEntity {

    @Comment("任务实例ID")
    @Column(nullable = false)
    private Long taskInstanceId;

    @Comment("任务定义ID")
    @Column(nullable = false)
    private Long taskId;

    @Comment("用户ID")
    @Column(nullable = false)
    private Long userId;

    @Comment("操作类型(DEFER/SKIP)")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10, columnDefinition = "VARCHAR(10)")
    private ActionType actionType;

    @Comment("原始日期")
    private LocalDate originalDate;

    @Comment("新日期")
    private LocalDate newDate;
}
