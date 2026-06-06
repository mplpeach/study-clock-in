package com.example.clockin.service;

import com.example.clockin.dto.GoalDTO;
import java.util.List;

public interface GoalService {
    GoalDTO createGoal(Long userId, GoalDTO.CreateRequest request);
    GoalDTO updateGoal(Long goalId, GoalDTO.UpdateRequest request);
    void deleteGoal(Long goalId);
    GoalDTO getGoal(Long goalId);
    List<GoalDTO> getUserGoals(Long userId);
    void reorderGoals(GoalDTO.ReorderRequest request);
}
