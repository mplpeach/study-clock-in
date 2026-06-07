package com.example.clockin.service;

import com.example.clockin.dto.CheckInDTO;
import com.example.clockin.dto.TimelineEntryDTO;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

public interface CheckInService {
    CheckInDTO startCheckIn(Long userId, CheckInDTO.StartRequest request);
    CheckInDTO endCheckIn(Long userId, CheckInDTO.EndRequest request, List<MultipartFile> images);
    CheckInDTO manualCheckIn(Long userId, CheckInDTO.ManualRequest request, List<MultipartFile> images);
    CheckInDTO getCheckInRecord(Long recordId);
    List<CheckInDTO> getRecordsByTaskInstance(Long taskInstanceId);
    List<CheckInDTO> getUserRecords(Long userId);
    boolean hasActiveCheckIn(Long userId);
    CheckInDTO.ActiveSessionResponse getActiveSession(Long userId);

    List<TimelineEntryDTO> getTimelineEntries(Long userId, LocalDate date);
}
