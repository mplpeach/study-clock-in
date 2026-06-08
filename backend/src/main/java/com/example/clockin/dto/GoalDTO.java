package com.example.clockin.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import java.util.List;

@Data
public class GoalDTO {
    private Long id;
    private String name;
    private String description;
    private String color;
    private Integer sortOrder;
    private List<TaskDTO> tasks;
    private int completedTaskCount;
    private int totalTaskCount;
    private long totalDurationMinutes;
    private int oneTimeTaskCount;
    private int oneTimeCompletedCount;
    private int recurringTaskCount;
    private int recurringWeeklyCompleted;
    private int recurringWeeklyTotal;
    private List<RecurringTaskStatus> recurringTasks;

    @Data
    @AllArgsConstructor
    public static class RecurringTaskStatus {
        private Long taskId;
        private String taskName;
        private boolean completedToday;
    }

    @Data
    public static class CreateRequest {
        @NotBlank(message = "目标名称不能为空")
        private String name;
        private String description;
        private String color = "#9DC8C8";
        private Integer sortOrder = 0;
    }

    @Data
    public static class UpdateRequest {
        private String name;
        private String description;
        private String color;
        private Integer sortOrder;
    }

    @Data
    public static class ReorderRequest {
        private List<ReorderItem> items;
        private String page;
    }

    @Data
    public static class ReorderItem {
        private Long id;
        private Integer sortOrder;
    }
}
