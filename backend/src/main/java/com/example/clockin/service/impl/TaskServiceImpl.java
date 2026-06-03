package com.example.clockin.service.impl;

import com.example.clockin.dto.TaskDTO;
import com.example.clockin.entity.GoalTask;
import com.example.clockin.entity.Task;
import com.example.clockin.repository.GoalTaskRepository;
import com.example.clockin.repository.TaskRepository;
import com.example.clockin.service.TaskService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class TaskServiceImpl implements TaskService {

    private final TaskRepository taskRepository;
    private final GoalTaskRepository goalTaskRepository;

    public TaskServiceImpl(TaskRepository taskRepository,
                           GoalTaskRepository goalTaskRepository) {
        this.taskRepository = taskRepository;
        this.goalTaskRepository = goalTaskRepository;
    }

    @Override
    @Transactional
    public TaskDTO createTask(Long userId, TaskDTO.CreateRequest request) {
        Task task = new Task();
        task.setName(request.getName());
        task.setDescription(request.getDescription());
        task.setUserId(userId);
        task = taskRepository.save(task);
        return toDTO(task);
    }

    @Override
    @Transactional
    public TaskDTO updateTask(Long taskId, TaskDTO.CreateRequest request) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new EntityNotFoundException("任务不存在"));
        if (request.getName() != null) task.setName(request.getName());
        if (request.getDescription() != null) task.setDescription(request.getDescription());
        task = taskRepository.save(task);
        return toDTO(task);
    }

    @Override
    @Transactional
    public void deleteTask(Long taskId) {
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
        return taskRepository.findByUserId(userId).stream()
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

    private TaskDTO toDTO(Task task) {
        TaskDTO dto = new TaskDTO();
        dto.setId(task.getId());
        dto.setName(task.getName());
        dto.setDescription(task.getDescription());
        return dto;
    }
}
