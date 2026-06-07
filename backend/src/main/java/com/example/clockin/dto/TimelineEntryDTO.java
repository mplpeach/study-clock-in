package com.example.clockin.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class TimelineEntryDTO {
    private Long recordId;
    private Long taskInstanceId;
    private Long taskId;
    private String taskName;
    private List<Long> goalIds;
    private List<String> goalNames;
    private List<String> goalColors;
    private String status;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private long durationMinutes;
    private String content;
    private String note;
    private List<String> imageUrls;
}
