package com.example.clockin.scheduler;

import com.example.clockin.entity.Task;
import com.example.clockin.enums.RepeatRule;
import com.example.clockin.enums.TaskStatus;
import com.example.clockin.repository.TaskRepository;
import com.example.clockin.service.TaskInstanceService;
import com.example.clockin.util.DateUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class TaskInstanceScheduler {

    private static final Logger log = LoggerFactory.getLogger(TaskInstanceScheduler.class);

    private final TaskRepository taskRepository;
    private final TaskInstanceService taskInstanceService;

    public TaskInstanceScheduler(TaskRepository taskRepository,
                                 TaskInstanceService taskInstanceService) {
        this.taskRepository = taskRepository;
        this.taskInstanceService = taskInstanceService;
    }

    @Scheduled(cron = "0 5 4 * * ?")
    public void autoCreateTodayInstances() {
        LocalDate today = DateUtil.getEffectiveToday();
        log.info("开始自动创建 {} 的任务实例", today);

        List<Task> tasks = taskRepository.findByRepeatRuleNotAndStatus(RepeatRule.NONE, TaskStatus.ACTIVE);
        int created = 0;

        for (Task task : tasks) {
            if (matchesToday(task, today)) {
                try {
                    taskInstanceService.createInstance(task.getUserId(), task.getId(), today);
                    created++;
                } catch (Exception e) {
                    log.error("创建任务实例失败: taskId={}, date={}: {}", task.getId(), today, e.getMessage());
                }
            }
        }

        log.info("自动创建完成: {}/{} 个任务匹配今天", created, tasks.size());
    }

    private boolean matchesToday(Task task, LocalDate today) {
        RepeatRule rule = task.getRepeatRule();
        if (rule == null || rule == RepeatRule.NONE) return false;
        if (rule == RepeatRule.DAILY) return true;
        if (rule == RepeatRule.WEEKLY) {
            String weeklyDays = task.getWeeklyDays();
            if (weeklyDays == null || weeklyDays.isBlank()) return false;
            int todayValue = today.getDayOfWeek().getValue();
            Set<Integer> configuredDays = Arrays.stream(weeklyDays.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .map(Integer::parseInt)
                    .collect(Collectors.toSet());
            return configuredDays.contains(todayValue);
        }
        return false;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        log.info("服务启动，兜底创建今日实例");
        autoCreateTodayInstances();
    }
}
