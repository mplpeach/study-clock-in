package com.example.clockin.controller;

import com.example.clockin.common.ApiResponse;
import com.example.clockin.dto.GoalDTO;
import com.example.clockin.service.GoalService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/goals")
public class GoalController {

    private static final Long DEFAULT_USER_ID = 1L;

    private final GoalService goalService;

    public GoalController(GoalService goalService) {
        this.goalService = goalService;
    }

    @GetMapping
    public ApiResponse<List<GoalDTO>> getAll() {
        return ApiResponse.success(goalService.getUserGoals(DEFAULT_USER_ID));
    }

    @GetMapping("/{id}")
    public ApiResponse<GoalDTO> getById(@PathVariable Long id) {
        return ApiResponse.success(goalService.getGoal(id));
    }

    @PostMapping
    public ApiResponse<GoalDTO> create(@Valid @RequestBody GoalDTO.CreateRequest request) {
        return ApiResponse.success(goalService.createGoal(DEFAULT_USER_ID, request));
    }

    @PutMapping("/{id}")
    public ApiResponse<GoalDTO> update(@PathVariable Long id,
                                       @RequestBody GoalDTO.UpdateRequest request) {
        return ApiResponse.success(goalService.updateGoal(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        goalService.deleteGoal(id);
        return ApiResponse.success();
    }
}
