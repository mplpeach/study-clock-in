package com.example.clockin.service.impl;

import com.example.clockin.dto.TaskDTO;
import com.example.clockin.entity.GoalTask;
import com.example.clockin.entity.Task;
import com.example.clockin.enums.RepeatRule;
import com.example.clockin.enums.TaskStatus;
import com.example.clockin.repository.GoalTaskRepository;
import com.example.clockin.repository.TaskRepository;
import com.example.clockin.service.TaskInstanceService;
import com.example.clockin.service.TaskService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class TaskServiceImpl implements TaskService {

    private final TaskRepository taskRepository;
    private final GoalTaskRepository goalTaskRepository;
    private final TaskInstanceService taskInstanceService;

    public TaskServiceImpl(TaskRepository taskRepository,
                           GoalTaskRepository goalTaskRepository,
                           TaskInstanceService taskInstanceService) {
        this.taskRepository = taskRepository;
        this.goalTaskRepository = goalTaskRepository;
        this.taskInstanceService = taskInstanceService;
    }

    @Override
    @Transactional
    public TaskDTO createTask(Long userId, TaskDTO.CreateRequest request) {
        Task task = new Task();
        task.setName(request.getName());
        task.setDescription(request.getDescription());
        task.setUserId(userId);
        if (request.getRepeatRule() != null && !request.getRepeatRule().isBlank()) {
            task.setRepeatRule(RepeatRule.valueOf(request.getRepeatRule()));
        }
        if (request.getWeeklyDays() != null && !request.getWeeklyDays().isBlank()) {
            task.setWeeklyDays(request.getWeeklyDays());
        }
        task = taskRepository.save(task);

        // 一次性安排：创建指定日期的实例
        if (request.getScheduledDate() != null && !request.getScheduledDate().isBlank()) {
            LocalDate date = LocalDate.parse(request.getScheduledDate());
            taskInstanceService.createInstance(userId, task.getId(), date);
            task.setScheduledDate(date);
            taskRepository.save(task);
        }

        // 重复规则：若今天匹配，立刻创建实例
        if (matchesToday(task)) {
            taskInstanceService.createInstance(userId, task.getId(), LocalDate.now());
        }

        return toDTO(task);
    }

    @Override
    @Transactional
    public TaskDTO updateTask(Long taskId, TaskDTO.CreateRequest request) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new EntityNotFoundException("任务不存在"));
        if (request.getName() != null) task.setName(request.getName());
        if (request.getDescription() != null) task.setDescription(request.getDescription());
        if (request.getRepeatRule() != null) {
            task.setRepeatRule(RepeatRule.valueOf(request.getRepeatRule()));
        }
        if (request.getWeeklyDays() != null) {
            task.setWeeklyDays(request.getWeeklyDays());
        }
        if (request.getScheduledDate() != null) {
            if (!request.getScheduledDate().isBlank()) {
                LocalDate date = LocalDate.parse(request.getScheduledDate());
                task.setScheduledDate(date);
                taskInstanceService.createInstance(task.getUserId(), task.getId(), date);
            } else {
                task.setScheduledDate(null);
            }
        }
        task = taskRepository.save(task);

        // 重复规则：若今天匹配，立刻创建实例
        if (matchesToday(task)) {
            taskInstanceService.createInstance(task.getUserId(), task.getId(), LocalDate.now());
        }

        return toDTO(task);
    }

    @Override
    @Transactional
    public void deleteTask(Long taskId) {
        // 级联删除所有实例（含打卡记录和图片）
        taskInstanceService.deleteInstancesByTaskId(taskId);
        goalTaskRepository.findByTaskId(taskId).forEach(gt -> {
            goalTaskRepository.deleteById(gt.getId());
        });
        taskRepository.deleteById(taskId);
    }

    @Override
    public TaskDTO getTask(Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new EntityNotFoundException("任务不存在"));
        return toDTO(task);
    }

    @Override
    public List<TaskDTO> getUserTasks(Long userId) {
        return taskRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public List<TaskDTO> searchTasks(Long userId, String keyword) {
        return taskRepository.searchByName(userId, keyword).stream()
                .map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void bindTaskToGoal(Long taskId, Long goalId) {
        if (goalTaskRepository.existsByGoalIdAndTaskId(goalId, taskId)) return;
        GoalTask gt = new GoalTask();
        gt.setGoalId(goalId);
        gt.setTaskId(taskId);
        goalTaskRepository.save(gt);
    }

    @Override
    @Transactional
    public void unbindTaskFromGoal(Long taskId, Long goalId) {
        goalTaskRepository.deleteByGoalIdAndTaskId(goalId, taskId);
    }

    @Override
    public List<TaskDTO> getTasksByGoal(Long goalId) {
        return taskRepository.findByGoalId(goalId).stream()
                .map(t -> {
                    TaskDTO dto = toDTO(t);
                    dto.setGoalId(goalId);
                    return dto;
                })
                .collect(Collectors.toList());
    }

    private boolean matchesToday(Task task) {
        RepeatRule rule = task.getRepeatRule();
        if (rule == null || rule == RepeatRule.NONE) return false;
        if (rule == RepeatRule.DAILY) return true;
        if (rule == RepeatRule.WEEKLY) {
            String weeklyDays = task.getWeeklyDays();
            if (weeklyDays == null || weeklyDays.isBlank()) return false;
            int todayValue = LocalDate.now().getDayOfWeek().getValue();
            Set<Integer> configuredDays = Arrays.stream(weeklyDays.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .map(Integer::parseInt)
                    .collect(Collectors.toSet());
            return configuredDays.contains(todayValue);
        }
        return false;
    }

    @Override
    @Transactional
    public void updateTaskGoals(Long taskId, List<Long> goalIds) {
        List<GoalTask> existing = goalTaskRepository.findByTaskId(taskId);
        Set<Long> currentIds = existing.stream()
                .map(GoalTask::getGoalId)
                .collect(Collectors.toSet());
        Set<Long> newIds = new java.util.HashSet<>(goalIds);

        for (GoalTask gt : existing) {
            if (!newIds.contains(gt.getGoalId())) {
                goalTaskRepository.delete(gt);
            }
        }

        for (Long gid : goalIds) {
            if (!currentIds.contains(gid)) {
                GoalTask gt = new GoalTask();
                gt.setTaskId(taskId);
                gt.setGoalId(gid);
                goalTaskRepository.save(gt);
            }
        }
    }

    @Override
    @Transactional
    public void completeTask(Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new EntityNotFoundException("任务不存在"));
        task.setStatus(TaskStatus.COMPLETED);
        taskRepository.save(task);
    }

    @Override
    @Transactional
    public void reactivateTask(Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new EntityNotFoundException("任务不存在"));
        task.setStatus(TaskStatus.ACTIVE);
        taskRepository.save(task);
    }

    private TaskDTO toDTO(Task task) {
        TaskDTO dto = new TaskDTO();
        dto.setId(task.getId());
        dto.setName(task.getName());
        dto.setDescription(task.getDescription());
        dto.setRepeatRule(task.getRepeatRule() != null ? task.getRepeatRule().name() : null);
        dto.setWeeklyDays(task.getWeeklyDays());
        dto.setScheduledDate(task.getScheduledDate() != null ? task.getScheduledDate().toString() : null);
        dto.setStatus(task.getStatus() != null ? task.getStatus().name() : TaskStatus.ACTIVE.name());
        dto.setCreatedAt(task.getCreatedAt());
        java.util.List<Long> goalIds = goalTaskRepository.findByTaskId(task.getId())
                .stream().map(GoalTask::getGoalId).collect(Collectors.toList());
        dto.setGoalIds(goalIds);
        if (!goalIds.isEmpty()) {
            dto.setGoalId(goalIds.get(0));
        }
        return dto;
    }
}
