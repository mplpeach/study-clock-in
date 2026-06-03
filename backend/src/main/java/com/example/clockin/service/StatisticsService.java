package com.example.clockin.service;

import com.example.clockin.dto.StatisticsDTO;

public interface StatisticsService {
    StatisticsDTO getUserStatistics(Long userId);
}
