package com.example.clockin.dto;

import jakarta.validation.constraints.NotBlank;
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
