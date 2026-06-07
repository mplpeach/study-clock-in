package com.example.clockin.controller;

import com.example.clockin.common.ApiResponse;
import com.example.clockin.dto.CheckInDTO;
import com.example.clockin.dto.TimelineEntryDTO;
import com.example.clockin.service.CheckInService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/checkins")
public class CheckInController {

    private static final Long DEFAULT_USER_ID = 1L;

    private final CheckInService checkInService;

    public CheckInController(CheckInService checkInService) {
        this.checkInService = checkInService;
    }

    @PostMapping("/start")
    public ApiResponse<CheckInDTO> start(@Valid @RequestBody CheckInDTO.StartRequest request) {
        return ApiResponse.success(checkInService.startCheckIn(DEFAULT_USER_ID, request));
    }

    @PostMapping("/end")
    public ApiResponse<CheckInDTO> end(@RequestPart CheckInDTO.EndRequest request,
                                        @RequestPart(required = false) List<MultipartFile> images) {
        return ApiResponse.success(checkInService.endCheckIn(DEFAULT_USER_ID, request, images));
    }

    @PostMapping("/manual")
    public ApiResponse<CheckInDTO> manual(@RequestPart @Valid CheckInDTO.ManualRequest request,
                                           @RequestPart(required = false) List<MultipartFile> images) {
        return ApiResponse.success(checkInService.manualCheckIn(DEFAULT_USER_ID, request, images));
    }

    @GetMapping("/has-active")
    public ApiResponse<Boolean> hasActive() {
        return ApiResponse.success(checkInService.hasActiveCheckIn(DEFAULT_USER_ID));
    }

    @GetMapping("/active")
    public ApiResponse<CheckInDTO.ActiveSessionResponse> getActive() {
        return ApiResponse.success(checkInService.getActiveSession(DEFAULT_USER_ID));
    }

    @GetMapping("/timeline")
    public ApiResponse<List<TimelineEntryDTO>> getTimeline(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ApiResponse.success(checkInService.getTimelineEntries(DEFAULT_USER_ID, date));
    }

    @GetMapping("/{id}")
    public ApiResponse<CheckInDTO> getById(@PathVariable Long id) {
        return ApiResponse.success(checkInService.getCheckInRecord(id));
    }

    @GetMapping("/by-instance/{instanceId}")
    public ApiResponse<List<CheckInDTO>> getByInstance(@PathVariable Long instanceId) {
        return ApiResponse.success(checkInService.getRecordsByTaskInstance(instanceId));
    }

    @GetMapping
    public ApiResponse<List<CheckInDTO>> getAll() {
        return ApiResponse.success(checkInService.getUserRecords(DEFAULT_USER_ID));
    }
}
