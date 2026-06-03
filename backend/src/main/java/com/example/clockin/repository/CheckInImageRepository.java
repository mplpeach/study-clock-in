package com.example.clockin.repository;

import com.example.clockin.entity.CheckInImage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CheckInImageRepository extends JpaRepository<CheckInImage, Long> {
    List<CheckInImage> findByRecordId(Long recordId);
    void deleteByRecordId(Long recordId);
}
