package com.example.clockin.repository;

import com.example.clockin.entity.TaskInstanceAction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TaskInstanceActionRepository extends JpaRepository<TaskInstanceAction, Long> {

    List<TaskInstanceAction> findByTaskInstanceIdOrderByCreatedAtDesc(Long taskInstanceId);

    List<TaskInstanceAction> findByUserIdOrderByCreatedAtDesc(Long userId);
}
