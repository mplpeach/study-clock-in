package com.example.clockin.repository;

import com.example.clockin.entity.GoalTask;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface GoalTaskRepository extends JpaRepository<GoalTask, Long> {
    List<GoalTask> findByGoalId(Long goalId);
    List<GoalTask> findByTaskId(Long taskId);
    Optional<GoalTask> findByGoalIdAndTaskId(Long goalId, Long taskId);
    void deleteByGoalIdAndTaskId(Long goalId, Long taskId);
    boolean existsByGoalIdAndTaskId(Long goalId, Long taskId);
}
