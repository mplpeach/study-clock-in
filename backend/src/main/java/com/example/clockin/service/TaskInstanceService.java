package com.example.clockin.service;

import com.example.clockin.dto.TaskInstanceDTO;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public interface TaskInstanceService {
    TaskInstanceDTO createInstance(Long userId, Long taskId, LocalDate date);
    List<TaskInstanceDTO> batchCreateInstances(Long userId, Long taskId, List<LocalDate> dates);
    List<TaskInstanceDTO> getInstancesByDate(Long userId, LocalDate date);
    Map<String, List<TaskInstanceDTO>> getMonthInstances(Long userId, int year, int month);
    List<TaskInstanceDTO> getOverdueInstances(Long userId);
    void deleteInstance(Long instanceId);
    void deleteInstancesByTaskId(Long taskId);
    TaskInstanceDTO deferInstance(Long instanceId);
    TaskInstanceDTO skipInstance(Long instanceId);
}
