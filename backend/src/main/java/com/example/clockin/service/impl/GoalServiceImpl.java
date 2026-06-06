package com.example.clockin.service.impl;

import com.example.clockin.dto.GoalDTO;
import com.example.clockin.dto.TaskDTO;
import com.example.clockin.entity.Goal;
import com.example.clockin.entity.GoalTask;
import com.example.clockin.repository.GoalRepository;
import com.example.clockin.repository.GoalTaskRepository;
import com.example.clockin.repository.TaskRepository;
import com.example.clockin.service.GoalService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class GoalServiceImpl implements GoalService {

    private final GoalRepository goalRepository;
    private final GoalTaskRepository goalTaskRepository;
    private final TaskRepository taskRepository;

    public GoalServiceImpl(GoalRepository goalRepository,
                           GoalTaskRepository goalTaskRepository,
                           TaskRepository taskRepository) {
        this.goalRepository = goalRepository;
        this.goalTaskRepository = goalTaskRepository;
        this.taskRepository = taskRepository;
    }

    @Override
    @Transactional
    public GoalDTO createGoal(Long userId, GoalDTO.CreateRequest request) {
        Goal goal = new Goal();
        goal.setName(request.getName());
        goal.setDescription(request.getDescription());
        goal.setColor(request.getColor());
        goal.setSortOrder(request.getSortOrder());
        goal.setUserId(userId);
        goal = goalRepository.save(goal);
        return toDTO(goal);
    }

    @Override
    @Transactional
    public GoalDTO updateGoal(Long goalId, GoalDTO.UpdateRequest request) {
        Goal goal = goalRepository.findById(goalId)
                .orElseThrow(() -> new EntityNotFoundException("目标不存在"));
        if (request.getName() != null) goal.setName(request.getName());
        if (request.getDescription() != null) goal.setDescription(request.getDescription());
        if (request.getColor() != null) goal.setColor(request.getColor());
        if (request.getSortOrder() != null) goal.setSortOrder(request.getSortOrder());
        goal = goalRepository.save(goal);
        return toDTO(goal);
    }

    @Override
    @Transactional
    public void deleteGoal(Long goalId) {
        goalTaskRepository.findByGoalId(goalId).forEach(gt -> {
            goalTaskRepository.deleteById(gt.getId());
        });
        goalRepository.deleteById(goalId);
    }

    @Override
    public GoalDTO getGoal(Long goalId) {
        Goal goal = goalRepository.findById(goalId)
                .orElseThrow(() -> new EntityNotFoundException("目标不存在"));
        return toDTO(goal);
    }

    @Override
    public List<GoalDTO> getUserGoals(Long userId) {
        List<Goal> goals = goalRepository.findByUserIdOrderBySortOrderAsc(userId);
        return goals.stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void reorderGoals(GoalDTO.ReorderRequest request) {
        for (GoalDTO.ReorderItem item : request.getItems()) {
            Goal goal = goalRepository.findById(item.getId())
                    .orElseThrow(() -> new EntityNotFoundException("目标不存在: " + item.getId()));
            goal.setSortOrder(item.getSortOrder());
            goalRepository.save(goal);
        }
    }

    private GoalDTO toDTO(Goal goal) {
        GoalDTO dto = new GoalDTO();
        dto.setId(goal.getId());
        dto.setName(goal.getName());
        dto.setDescription(goal.getDescription());
        dto.setColor(goal.getColor());
        dto.setSortOrder(goal.getSortOrder());

        List<TaskDTO> tasks = goalTaskRepository.findByGoalId(goal.getId()).stream()
                .map(gt -> taskRepository.findById(gt.getTaskId()).orElse(null))
                .filter(t -> t != null)
                .map(t -> {
                    TaskDTO td = new TaskDTO();
                    td.setId(t.getId());
                    td.setName(t.getName());
                    td.setDescription(t.getDescription());
                    td.setGoalId(goal.getId());
                    return td;
                })
                .collect(Collectors.toList());
        dto.setTasks(tasks);
        return dto;
    }
}
