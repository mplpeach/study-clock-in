package com.example.clockin.dto;

import com.example.clockin.enums.CheckInType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class CheckInDTO {
    private Long id;
    private Long taskInstanceId;
    private Long taskId;
    private String taskName;
    private Long goalId;
    private String goalName;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Integer durationMinutes;
    private String content;
    private String note;
    private CheckInType checkInType;
    private List<String> imageUrls;

    @Data
    public static class StartRequest {
        @NotNull(message = "任务实例ID不能为空")
        private Long taskInstanceId;
    }

    @Data
    public static class EndRequest {
        @NotNull(message = "打卡记录ID不能为空")
        private Long recordId;
        private String content;
        private String note;
        private boolean complete = true;
        private Integer durationSeconds;
    }

    @Data
    public static class ManualRequest {
        @NotNull(message = "任务实例ID不能为空")
        private Long taskInstanceId;
        private LocalDateTime startTime;
        private LocalDateTime endTime;
        private Integer durationMinutes;
        private String content;
        private String note;
    }

    @Data
    public static class QueryRequest {
        private String date;
        private Integer year;
        private Integer month;
    }

    @Data
    public static class ActiveSessionResponse {
        private Long recordId;
        private Long instanceId;
        private Long taskId;
        private String taskName;
        private LocalDateTime startTime;
        private long accumulatedSeconds;
        private long elapsedSeconds;
    }
}
