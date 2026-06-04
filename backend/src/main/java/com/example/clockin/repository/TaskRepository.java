package com.example.clockin.repository;

import com.example.clockin.enums.RepeatRule;
import com.example.clockin.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByUserId(Long userId);

    @Query("SELECT t FROM Task t JOIN GoalTask gt ON t.id = gt.taskId WHERE gt.goalId = :goalId")
    List<Task> findByGoalId(@Param("goalId") Long goalId);

    @Query("SELECT t FROM Task t WHERE t.userId = :userId AND t.name LIKE %:keyword%")
    List<Task> searchByName(@Param("userId") Long userId, @Param("keyword") String keyword);

    List<Task> findByRepeatRuleNot(RepeatRule repeatRule);
}
