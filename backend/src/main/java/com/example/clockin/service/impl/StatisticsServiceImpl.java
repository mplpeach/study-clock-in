package com.example.clockin.service.impl;

import com.example.clockin.dto.StatisticsDTO;
import com.example.clockin.entity.Goal;
import com.example.clockin.entity.GoalTask;
import com.example.clockin.entity.TaskInstance;
import com.example.clockin.enums.TaskInstanceStatus;
import com.example.clockin.repository.*;
import com.example.clockin.service.StatisticsService;
import com.example.clockin.util.DateUtil;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class StatisticsServiceImpl implements StatisticsService {

    private final CheckInRecordRepository recordRepository;
    private final GoalRepository goalRepository;
    private final GoalTaskRepository goalTaskRepository;
    private final TaskInstanceRepository instanceRepository;
    private final TaskRepository taskRepository;

    public StatisticsServiceImpl(CheckInRecordRepository recordRepository,
                                 GoalRepository goalRepository,
                                 GoalTaskRepository goalTaskRepository,
                                 TaskInstanceRepository instanceRepository,
                                 TaskRepository taskRepository) {
        this.recordRepository = recordRepository;
        this.goalRepository = goalRepository;
        this.goalTaskRepository = goalTaskRepository;
        this.instanceRepository = instanceRepository;
        this.taskRepository = taskRepository;
    }

    @Override
    public StatisticsDTO getUserStatistics(Long userId) {
        StatisticsDTO stats = new StatisticsDTO();

        List<Object[]> rawStats = getDailyStats(userId);
        stats.setDailyStats(rawStats.stream().map(r -> {
            StatisticsDTO.DailyStats ds = new StatisticsDTO.DailyStats();
            ds.setDate(r[0].toString());
            ds.setCount(((Number) r[1]).intValue());
            ds.setDurationMinutes(((Number) r[2]).longValue());
            return ds;
        }).collect(Collectors.toList()));

        stats.setTotalDurationMinutes(
                stats.getDailyStats().stream().mapToLong(StatisticsDTO.DailyStats::getDurationMinutes).sum()
        );
        stats.setTotalCheckInDays(stats.getDailyStats().size());

        stats.setCurrentStreak(calculateCurrentStreak(stats.getDailyStats()));
        stats.setLongestStreak(calculateLongestStreak(stats.getDailyStats()));

        stats.setGoalStats(getGoalStats(userId));

        // 本周完成任务
        LocalDate today = DateUtil.getEffectiveToday();
        java.time.DayOfWeek dayOfWeek = today.getDayOfWeek();
        int offset = (dayOfWeek == java.time.DayOfWeek.SUNDAY) ? 6 : dayOfWeek.getValue() - 1;
        LocalDate monday = today.minusDays(offset);
        LocalDate sunday = monday.plusDays(6);
        stats.setWeeklyCompletedTasks(
            (int) instanceRepository.countByUserIdAndStatusAndScheduledDateBetween(
                userId, TaskInstanceStatus.COMPLETED, monday, sunday)
        );

        return stats;
    }

    private List<Object[]> getDailyStats(Long userId) {
        return recordRepository.findAll().stream()
                .filter(r -> r.getUserId().equals(userId) && r.getStartTime() != null)
                .collect(Collectors.groupingBy(
                        r -> DateUtil.getEffectiveDate(r.getStartTime()),
                        LinkedHashMap::new,
                        Collectors.collectingAndThen(
                                Collectors.toList(),
                                list -> {
                                    long totalMin = list.stream()
                                            .filter(r -> r.getDurationMinutes() != null)
                                            .mapToLong(r -> r.getDurationMinutes().longValue())
                                            .sum();
                                    return new Object[]{list.get(0).getStartTime().toLocalDate().toString(), list.size(), totalMin};
                                }
                        )
                )).values().stream()
                .sorted((a, b) -> ((String) b[0]).compareTo((String) a[0]))
                .collect(Collectors.toList());
    }

    private int calculateCurrentStreak(List<StatisticsDTO.DailyStats> dailyStats) {
        if (dailyStats.isEmpty()) return 0;
        int streak = 0;
        LocalDate today = DateUtil.getEffectiveToday();
        Set<String> dateSet = dailyStats.stream()
                .map(StatisticsDTO.DailyStats::getDate)
                .collect(Collectors.toSet());

        LocalDate cursor = today;
        while (dateSet.contains(cursor.toString())) {
            streak++;
            cursor = cursor.minusDays(1);
        }
        return streak;
    }

    private int calculateLongestStreak(List<StatisticsDTO.DailyStats> dailyStats) {
        if (dailyStats.isEmpty()) return 0;
        Set<String> dateSet = dailyStats.stream()
                .map(StatisticsDTO.DailyStats::getDate)
                .collect(Collectors.toSet());

        List<LocalDate> sortedDates = dateSet.stream()
                .map(LocalDate::parse)
                .sorted()
                .collect(Collectors.toList());

        int maxStreak = 1;
        int currentStreak = 1;
        for (int i = 1; i < sortedDates.size(); i++) {
            if (ChronoUnit.DAYS.between(sortedDates.get(i - 1), sortedDates.get(i)) == 1) {
                currentStreak++;
                maxStreak = Math.max(maxStreak, currentStreak);
            } else {
                currentStreak = 1;
            }
        }
        return maxStreak;
    }

    private List<StatisticsDTO.GoalStats> getGoalStats(Long userId) {
        List<Goal> goals = goalRepository.findByUserIdOrderBySortOrderAsc(userId);
        return goals.stream().map(goal -> {
            StatisticsDTO.GoalStats gs = new StatisticsDTO.GoalStats();
            gs.setGoalId(goal.getId());
            gs.setGoalName(goal.getName());
            gs.setColor(goal.getColor());

            List<Long> taskIds = goalTaskRepository.findByGoalId(goal.getId()).stream()
                    .map(GoalTask::getTaskId)
                    .collect(Collectors.toList());

            long totalDuration = 0;
            int totalTasks = 0;
            int completedTasks = 0;

            for (Long taskId : taskIds) {
                List<TaskInstance> instances = instanceRepository.findByTaskIdOrderByDateDesc(taskId, userId);
                totalTasks += instances.size();
                completedTasks += instances.stream()
                        .filter(i -> i.getStatus() == TaskInstanceStatus.COMPLETED)
                        .count();

                totalDuration += instances.stream()
                        .filter(i -> i.getStatus() == TaskInstanceStatus.COMPLETED)
                        .flatMap(i -> recordRepository.findByTaskInstanceId(i.getId()).stream())
                        .filter(r -> r.getDurationMinutes() != null)
                        .mapToLong(r -> r.getDurationMinutes().longValue())
                        .sum();
            }

            gs.setTotalDurationMinutes(totalDuration);
            gs.setTotalTasks(totalTasks);
            gs.setCompletedTasks(completedTasks);
            return gs;
        }).collect(Collectors.toList());
    }
}
