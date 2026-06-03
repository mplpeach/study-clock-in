package com.example.clockin.repository;

import com.example.clockin.entity.Goal;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface GoalRepository extends JpaRepository<Goal, Long> {
    List<Goal> findByUserIdOrderBySortOrderAsc(Long userId);
}
