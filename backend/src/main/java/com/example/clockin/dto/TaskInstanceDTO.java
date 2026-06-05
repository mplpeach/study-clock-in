package com.example.clockin.dto;

import com.example.clockin.enums.TaskInstanceStatus;
import lombok.Data;
import java.time.LocalDate;

@Data
public class TaskInstanceDTO {
    private Long id;
    private Long taskId;
    private String taskName;
    private String description;
    private Long goalId;
    private String goalName;
    private java.util.List<Long> goalIds;
    private java.util.List<String> goalNames;
    private String repeatRule;
    private String taskScheduledDate;
    private LocalDate scheduledDate;
    private TaskInstanceStatus status;
    private Integer deferCount;

    @Data
    public static class CreateRequest {
        private Long taskId;
        private LocalDate scheduledDate;
    }

    @Data
    public static class BatchCreateRequest {
        private Long taskId;
        private java.util.List<LocalDate> dates;
    }

    @Data
    public static class CalendarQuery {
        private int year;
        private int month;
    }
}
