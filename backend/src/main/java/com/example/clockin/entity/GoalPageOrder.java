package com.example.clockin.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Comment;

@Getter
@Setter
@Entity
@Comment("目标按页面排序表")
@Table(name = "goal_page_orders", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "goal_id", "page"})
})
public class GoalPageOrder extends BaseEntity {

    @Comment("目标ID")
    @Column(name = "goal_id", nullable = false)
    private Long goalId;

    @Comment("用户ID")
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Comment("页面标识: checkin/goals/tasks")
    @Column(length = 20, nullable = false)
    private String page;

    @Comment("排序序号")
    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;
}
