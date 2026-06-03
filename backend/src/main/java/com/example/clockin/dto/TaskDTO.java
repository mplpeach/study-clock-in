package com.example.clockin.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TaskDTO {
    private Long id;
    private String name;
    private String description;
    private Long goalId;

    @Data
    public static class CreateRequest {
        @NotBlank(message = "任务名称不能为空")
        private String name;
        private String description;
    }

    @Data
    public static class BindRequest {
        private Long taskId;
        private Long goalId;
    }

    @Data
    public static class SearchRequest {
        private String keyword;
    }
}
