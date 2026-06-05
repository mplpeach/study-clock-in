package com.example.clockin.service.impl;

import com.example.clockin.dto.TaskInstanceDTO;
import com.example.clockin.entity.*;
import com.example.clockin.enums.TaskInstanceStatus;
import com.example.clockin.repository.*;
import com.example.clockin.service.TaskInstanceService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class TaskInstanceServiceImpl implements TaskInstanceService {

    private final TaskInstanceRepository instanceRepository;
    private final TaskRepository taskRepository;
    private final GoalTaskRepository goalTaskRepository;
    private final GoalRepository goalRepository;
    private final CheckInRecordRepository checkInRecordRepository;
    private final CheckInImageRepository checkInImageRepository;

    public TaskInstanceServiceImpl(TaskInstanceRepository instanceRepository,
                                   TaskRepository taskRepository,
                                   GoalTaskRepository goalTaskRepository,
                                   GoalRepository goalRepository,
                                   CheckInRecordRepository checkInRecordRepository,
                                   CheckInImageRepository checkInImageRepository) {
        this.instanceRepository = instanceRepository;
        this.taskRepository = taskRepository;
        this.goalTaskRepository = goalTaskRepository;
        this.goalRepository = goalRepository;
        this.checkInRecordRepository = checkInRecordRepository;
        this.checkInImageRepository = checkInImageRepository;
    }

    @Override
    @Transactional
    public TaskInstanceDTO createInstance(Long userId, Long taskId, LocalDate date) {
        if (instanceRepository.existsByTaskIdAndScheduledDateAndUserId(taskId, date, userId)) {
            TaskInstance existing = instanceRepository
                    .findByTaskIdAndScheduledDateAndUserId(taskId, date, userId)
                    .orElseThrow(() -> new RuntimeException("任务实例已存在"));
            return toDTO(existing);
        }

        TaskInstance instance = new TaskInstance();
        instance.setTaskId(taskId);
        instance.setUserId(userId);
        instance.setScheduledDate(date);
        instance.setStatus(TaskInstanceStatus.TODO);
        instance = instanceRepository.save(instance);
        return toDTO(instance);
    }

    @Override
    @Transactional
    public List<TaskInstanceDTO> batchCreateInstances(Long userId, Long taskId, List<LocalDate> dates) {
        return dates.stream()
                .map(date -> createInstance(userId, taskId, date))
                .collect(Collectors.toList());
    }

    @Override
    public List<TaskInstanceDTO> getInstancesByDate(Long userId, LocalDate date) {
        return instanceRepository.findByUserIdAndScheduledDate(userId, date).stream()
                .map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public Map<String, List<TaskInstanceDTO>> getMonthInstances(Long userId, int year, int month) {
        LocalDate start = LocalDate.of(year, month, 1);
        LocalDate end = start.withDayOfMonth(start.lengthOfMonth());

        List<TaskInstance> instances = instanceRepository
                .findByUserIdAndScheduledDateBetween(userId, start, end);

        return instances.stream()
                .collect(Collectors.groupingBy(
                        i -> i.getScheduledDate().toString(),
                        LinkedHashMap::new,
                        Collectors.mapping(this::toDTO, Collectors.toList())
                ));
    }

    @Override
    public List<TaskInstanceDTO> getOverdueInstances(Long userId) {
        return instanceRepository.findOverdueInstances(userId, LocalDate.now()).stream()
                .map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deleteInstance(Long instanceId) {
        List<CheckInRecord> records = checkInRecordRepository.findByTaskInstanceId(instanceId);
        for (CheckInRecord record : records) {
            checkInImageRepository.deleteByRecordId(record.getId());
            checkInRecordRepository.deleteById(record.getId());
        }
        instanceRepository.deleteById(instanceId);
    }

    @Override
    @Transactional
    public void deleteInstancesByTaskId(Long taskId) {
        List<TaskInstance> instances = instanceRepository.findByTaskId(taskId);
        for (TaskInstance instance : instances) {
            List<CheckInRecord> records = checkInRecordRepository.findByTaskInstanceId(instance.getId());
            for (CheckInRecord record : records) {
                checkInImageRepository.deleteByRecordId(record.getId());
                checkInRecordRepository.deleteById(record.getId());
            }
        }
        instanceRepository.deleteAll(instances);
    }

    private TaskInstanceDTO toDTO(TaskInstance instance) {
        TaskInstanceDTO dto = new TaskInstanceDTO();
        dto.setId(instance.getId());
        dto.setTaskId(instance.getTaskId());
        dto.setScheduledDate(instance.getScheduledDate());
        dto.setStatus(instance.getStatus());

        Task task = taskRepository.findById(instance.getTaskId()).orElse(null);
        if (task != null) {
            dto.setTaskName(task.getName());
            dto.setDescription(task.getDescription());
            dto.setRepeatRule(task.getRepeatRule().name());
            if (task.getScheduledDate() != null) {
                dto.setTaskScheduledDate(task.getScheduledDate().toString());
            }

            List<GoalTask> goalTasks = goalTaskRepository.findByTaskId(task.getId());
            List<Long> goalIds = goalTasks.stream().map(GoalTask::getGoalId).collect(Collectors.toList());
            dto.setGoalIds(goalIds);

            List<String> goalNames = goalTasks.stream()
                    .map(gt -> goalRepository.findById(gt.getGoalId())
                            .map(Goal::getName).orElse(null))
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
            dto.setGoalNames(goalNames);

            if (!goalIds.isEmpty()) {
                dto.setGoalId(goalIds.get(0));
                if (!goalNames.isEmpty()) {
                    dto.setGoalName(goalNames.get(0));
                }
            }
        }

        return dto;
    }
}
