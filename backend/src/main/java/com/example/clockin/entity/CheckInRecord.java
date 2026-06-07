package com.example.clockin.entity;

import com.example.clockin.enums.CheckInType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Comment;
import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Comment("打卡记录表")
@Table(name = "check_in_records", indexes = {
    @Index(name = "idx_task_instance", columnList = "taskInstanceId"),
    @Index(name = "idx_user_time", columnList = "userId, startTime")
})
public class CheckInRecord extends BaseEntity {

    @Comment("任务实例ID")
    @Column(nullable = false)
    private Long taskInstanceId;

    @Comment("用户ID")
    @Column(nullable = false)
    private Long userId;

    @Comment("开始时间")
    private LocalDateTime startTime;

    @Comment("结束时间")
    private LocalDateTime endTime;

    @Comment("时长(分钟)")
    private Integer durationMinutes;

    @Comment("打卡内容")
    @Column(columnDefinition = "TEXT")
    private String content;

    @Comment("备注")
    @Column(columnDefinition = "TEXT")
    private String note;

    @Comment("打卡类型(REALTIME/MANUAL)")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, columnDefinition = "VARCHAR(20)")
    private CheckInType checkInType;
}
