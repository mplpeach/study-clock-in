package com.example.clockin.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Comment;
import java.util.Set;

@Getter
@Setter
@Entity
@Comment("目标表")
@Table(name = "goals")
public class Goal extends BaseEntity {

    @Comment("目标名称")
    @Column(nullable = false, length = 100)
    private String name;

    @Comment("目标描述")
    @Column(columnDefinition = "TEXT")
    private String description;

    @Comment("标识颜色")
    @Column(length = 7)
    private String color;

    @Comment("排序序号")
    @Column(nullable = false)
    private Integer sortOrder = 0;

    @Comment("用户ID")
    @Column(nullable = false)
    private Long userId;
}
