package com.example.clockin.repository;

import com.example.clockin.entity.CheckInRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;

public interface CheckInRecordRepository extends JpaRepository<CheckInRecord, Long> {

    List<CheckInRecord> findByTaskInstanceId(Long taskInstanceId);

    java.util.List<CheckInRecord> findByUserIdAndEndTimeIsNull(Long userId);

    @Query("SELECT r FROM CheckInRecord r WHERE r.taskInstanceId = :instanceId AND r.endTime IS NULL")
    List<CheckInRecord> findByTaskInstanceIdAndEndTimeIsNull(@Param("instanceId") Long instanceId);

    List<CheckInRecord> findByUserIdAndStartTimeBetween(Long userId, LocalDateTime start, LocalDateTime end);

    List<CheckInRecord> findByUserIdOrderByStartTimeDesc(Long userId);

    @Query("SELECT COALESCE(SUM(r.durationMinutes), 0) FROM CheckInRecord r " +
           "WHERE r.userId = :userId AND r.startTime BETWEEN :start AND :end")
    Long sumDurationByUserIdAndDateRange(@Param("userId") Long userId,
                                          @Param("start") LocalDateTime start,
                                          @Param("end") LocalDateTime end);
}
