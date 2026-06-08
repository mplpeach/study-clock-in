package com.example.clockin.repository;

import com.example.clockin.entity.GoalPageOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface GoalPageOrderRepository extends JpaRepository<GoalPageOrder, Long> {

    List<GoalPageOrder> findByUserIdAndPageOrderBySortOrderAsc(Long userId, String page);

    @Modifying
    @Transactional
    @Query("DELETE FROM GoalPageOrder po WHERE po.userId = :userId AND po.page = :page")
    void deleteByUserIdAndPage(Long userId, String page);

    List<GoalPageOrder> findByUserIdAndPageAndGoalId(Long userId, String page, Long goalId);
}
