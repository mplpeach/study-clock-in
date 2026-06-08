package com.example.clockin.service.impl;

import com.example.clockin.dto.GoalDTO;
import com.example.clockin.dto.TaskDTO;
import com.example.clockin.entity.Goal;
import com.example.clockin.entity.GoalPageOrder;
import com.example.clockin.entity.GoalTask;
import com.example.clockin.repository.GoalPageOrderRepository;
import com.example.clockin.repository.GoalRepository;
import com.example.clockin.repository.GoalTaskRepository;
import com.example.clockin.repository.TaskRepository;
import com.example.clockin.service.GoalService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class GoalServiceImpl implements GoalService {

    private final GoalRepository goalRepository;
    private final GoalTaskRepository goalTaskRepository;
    private final TaskRepository taskRepository;
    private final GoalPageOrderRepository goalPageOrderRepository;

    public GoalServiceImpl(GoalRepository goalRepository,
                           GoalTaskRepository goalTaskRepository,
                           TaskRepository taskRepository,
                           GoalPageOrderRepository goalPageOrderRepository) {
        this.goalRepository = goalRepository;
        this.goalTaskRepository = goalTaskRepository;
        this.taskRepository = taskRepository;
        this.goalPageOrderRepository = goalPageOrderRepository;
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
    public List<GoalDTO> getUserGoals(Long userId, String page) {
        List<Goal> goals = goalRepository.findByUserIdOrderBySortOrderAsc(userId);
        Map<Long, Integer> pageOrderMap = new HashMap<>();
        goalPageOrderRepository.findByUserIdAndPageOrderBySortOrderAsc(userId, page)
                .forEach(po -> pageOrderMap.put(po.getGoalId(), po.getSortOrder()));

        goals.sort((a, b) -> {
            int orderA = pageOrderMap.getOrDefault(a.getId(), a.getSortOrder() != null ? a.getSortOrder() : 0);
            int orderB = pageOrderMap.getOrDefault(b.getId(), b.getSortOrder() != null ? b.getSortOrder() : 0);
            return Integer.compare(orderA, orderB);
        });
        return goals.stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void reorderGoals(GoalDTO.ReorderRequest request) {
        String page = request.getPage() != null ? request.getPage() : "goals";
        Long userId = 1L; // 硬编码，当前无认证系统
        goalPageOrderRepository.deleteByUserIdAndPage(userId, page);

        for (GoalDTO.ReorderItem item : request.getItems()) {
            GoalPageOrder po = new GoalPageOrder();
            po.setGoalId(item.getId());
            po.setUserId(userId);
            po.setPage(page);
            po.setSortOrder(item.getSortOrder());
            goalPageOrderRepository.save(po);
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
                    td.setStatus(t.getStatus().name());
                    return td;
                })
                .collect(Collectors.toList());
        dto.setTasks(tasks);
        dto.setTotalTaskCount(tasks.size());
        dto.setCompletedTaskCount((int) tasks.stream()
                .filter(t -> "COMPLETED".equals(t.getStatus())).count());
        return dto;
    }
}
