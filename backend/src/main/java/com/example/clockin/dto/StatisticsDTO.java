package com.example.clockin.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class StatisticsDTO {
    private int totalCheckInDays;
    private int currentStreak;
    private int longestStreak;
    private long totalDurationMinutes;
    private int weeklyCompletedTasks;

    private List<DailyStats> dailyStats;

    private List<GoalStats> goalStats;

    @Data
    public static class DailyStats {
        private String date;
        private int count;
        private long durationMinutes;
    }

    @Data
    public static class GoalStats {
        private Long goalId;
        private String goalName;
        private String color;
        private long totalDurationMinutes;
        private int totalTasks;
        private int completedTasks;
    }
}
