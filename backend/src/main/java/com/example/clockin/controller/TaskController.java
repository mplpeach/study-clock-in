package com.example.clockin.controller;

import com.example.clockin.common.ApiResponse;
import com.example.clockin.dto.TaskDTO;
import com.example.clockin.service.TaskService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private static final Long DEFAULT_USER_ID = 1L;

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping
    public ApiResponse<List<TaskDTO>> getAll() {
        return ApiResponse.success(taskService.getUserTasks(DEFAULT_USER_ID));
    }

    @GetMapping("/{id}")
    public ApiResponse<TaskDTO> getById(@PathVariable Long id) {
        return ApiResponse.success(taskService.getTask(id));
    }

    @GetMapping("/search")
    public ApiResponse<List<TaskDTO>> search(@RequestParam String keyword) {
        return ApiResponse.success(taskService.searchTasks(DEFAULT_USER_ID, keyword));
    }

    @PostMapping
    public ApiResponse<TaskDTO> create(@Valid @RequestBody TaskDTO.CreateRequest request) {
        return ApiResponse.success(taskService.createTask(DEFAULT_USER_ID, request));
    }

    @PutMapping("/{id}")
    public ApiResponse<TaskDTO> update(@PathVariable Long id,
                                       @Valid @RequestBody TaskDTO.CreateRequest request) {
        return ApiResponse.success(taskService.updateTask(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        taskService.deleteTask(id);
        return ApiResponse.success();
    }

    @PostMapping("/bind")
    public ApiResponse<Void> bindToGoal(@RequestBody TaskDTO.BindRequest request) {
        taskService.bindTaskToGoal(request.getTaskId(), request.getGoalId());
        return ApiResponse.success();
    }

    @PostMapping("/unbind")
    public ApiResponse<Void> unbindFromGoal(@RequestBody TaskDTO.BindRequest request) {
        taskService.unbindTaskFromGoal(request.getTaskId(), request.getGoalId());
        return ApiResponse.success();
    }

    @GetMapping("/by-goal/{goalId}")
    public ApiResponse<List<TaskDTO>> getByGoal(@PathVariable Long goalId) {
        return ApiResponse.success(taskService.getTasksByGoal(goalId));
    }

    @PutMapping("/{id}/complete")
    public ApiResponse<Void> complete(@PathVariable Long id) {
        taskService.completeTask(id);
        return ApiResponse.success();
    }

    @PutMapping("/{id}/reactivate")
    public ApiResponse<Void> reactivate(@PathVariable Long id) {
        taskService.reactivateTask(id);
        return ApiResponse.success();
    }
}
