package com.example.clockin.controller;

import com.example.clockin.common.ApiResponse;
import com.example.clockin.dto.TaskInstanceDTO;
import com.example.clockin.service.TaskInstanceService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/instances")
public class TaskInstanceController {

    private static final Long DEFAULT_USER_ID = 1L;

    private final TaskInstanceService instanceService;

    public TaskInstanceController(TaskInstanceService instanceService) {
        this.instanceService = instanceService;
    }

    @PostMapping
    public ApiResponse<TaskInstanceDTO> create(@RequestParam Long taskId,
                                                @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ApiResponse.success(instanceService.createInstance(DEFAULT_USER_ID, taskId, date));
    }

    @PostMapping("/batch")
    public ApiResponse<List<TaskInstanceDTO>> batchCreate(@RequestBody TaskInstanceDTO.BatchCreateRequest request) {
        return ApiResponse.success(
                instanceService.batchCreateInstances(DEFAULT_USER_ID, request.getTaskId(), request.getDates())
        );
    }

    @GetMapping("/date")
    public ApiResponse<List<TaskInstanceDTO>> getByDate(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ApiResponse.success(instanceService.getInstancesByDate(DEFAULT_USER_ID, date));
    }

    @GetMapping("/calendar")
    public ApiResponse<Map<String, List<TaskInstanceDTO>>> getCalendar(
            @RequestParam int year, @RequestParam int month) {
        return ApiResponse.success(instanceService.getMonthInstances(DEFAULT_USER_ID, year, month));
    }

    @GetMapping("/overdue")
    public ApiResponse<List<TaskInstanceDTO>> getOverdue() {
        return ApiResponse.success(instanceService.getOverdueInstances(DEFAULT_USER_ID));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        instanceService.deleteInstance(id);
        return ApiResponse.success();
    }
}
