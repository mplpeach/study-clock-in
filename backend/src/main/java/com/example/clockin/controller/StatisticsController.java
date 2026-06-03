package com.example.clockin.controller;

import com.example.clockin.common.ApiResponse;
import com.example.clockin.dto.StatisticsDTO;
import com.example.clockin.service.StatisticsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/statistics")
public class StatisticsController {

    private static final Long DEFAULT_USER_ID = 1L;

    private final StatisticsService statisticsService;

    public StatisticsController(StatisticsService statisticsService) {
        this.statisticsService = statisticsService;
    }

    @GetMapping
    public ApiResponse<StatisticsDTO> getStatistics() {
        return ApiResponse.success(statisticsService.getUserStatistics(DEFAULT_USER_ID));
    }
}
