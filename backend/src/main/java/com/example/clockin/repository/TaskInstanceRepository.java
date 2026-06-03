package com.example.clockin.repository;

import com.example.clockin.enums.TaskInstanceStatus;
import com.example.clockin.entity.TaskInstance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TaskInstanceRepository extends JpaRepository<TaskInstance, Long> {

    List<TaskInstance> findByUserIdAndScheduledDate(Long userId, LocalDate date);

    List<TaskInstance> findByUserIdAndScheduledDateBetween(Long userId, LocalDate start, LocalDate end);

    List<TaskInstance> findByUserIdAndScheduledDateAndStatus(Long userId, LocalDate date, TaskInstanceStatus status);

    Optional<TaskInstance> findByTaskIdAndScheduledDateAndUserId(Long taskId, LocalDate date, Long userId);

    @Query("SELECT ti FROM TaskInstance ti WHERE ti.userId = :userId AND ti.scheduledDate < :today AND ti.status <> 'COMPLETED' ORDER BY ti.scheduledDate ASC")
    List<TaskInstance> findOverdueInstances(@Param("userId") Long userId, @Param("today") LocalDate today);

    @Query("SELECT ti FROM TaskInstance ti WHERE ti.taskId = :taskId AND ti.userId = :userId ORDER BY ti.scheduledDate DESC")
    List<TaskInstance> findByTaskIdOrderByDateDesc(@Param("taskId") Long taskId, @Param("userId") Long userId);

    boolean existsByTaskIdAndScheduledDateAndUserId(Long taskId, LocalDate date, Long userId);
}
