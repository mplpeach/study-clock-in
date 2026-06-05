package com.example.clockin.service;

import com.example.clockin.dto.TaskDTO;
import java.util.List;

public interface TaskService {
    TaskDTO createTask(Long userId, TaskDTO.CreateRequest request);
    TaskDTO updateTask(Long taskId, TaskDTO.CreateRequest request);
    void deleteTask(Long taskId);
    TaskDTO getTask(Long taskId);
    List<TaskDTO> getUserTasks(Long userId);
    List<TaskDTO> searchTasks(Long userId, String keyword);
    void bindTaskToGoal(Long taskId, Long goalId);
    void unbindTaskFromGoal(Long taskId, Long goalId);
    List<TaskDTO> getTasksByGoal(Long goalId);
    void updateTaskGoals(Long taskId, List<Long> goalIds);
    void completeTask(Long taskId);
    void reactivateTask(Long taskId);
}
