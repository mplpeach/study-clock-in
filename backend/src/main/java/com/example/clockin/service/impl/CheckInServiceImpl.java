package com.example.clockin.service.impl;

import com.example.clockin.dto.CheckInDTO;
import com.example.clockin.entity.*;
import com.example.clockin.enums.CheckInType;
import com.example.clockin.enums.RepeatRule;
import com.example.clockin.enums.TaskInstanceStatus;
import com.example.clockin.enums.TaskStatus;
import com.example.clockin.repository.*;
import com.example.clockin.service.CheckInService;
import com.example.clockin.service.FileStorageService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class CheckInServiceImpl implements CheckInService {

    private final CheckInRecordRepository recordRepository;
    private final CheckInImageRepository imageRepository;
    private final TaskInstanceRepository instanceRepository;
    private final TaskRepository taskRepository;
    private final GoalTaskRepository goalTaskRepository;
    private final GoalRepository goalRepository;
    private final FileStorageService fileStorageService;

    public CheckInServiceImpl(CheckInRecordRepository recordRepository,
                              CheckInImageRepository imageRepository,
                              TaskInstanceRepository instanceRepository,
                              TaskRepository taskRepository,
                              GoalTaskRepository goalTaskRepository,
                              GoalRepository goalRepository,
                              FileStorageService fileStorageService) {
        this.recordRepository = recordRepository;
        this.imageRepository = imageRepository;
        this.instanceRepository = instanceRepository;
        this.taskRepository = taskRepository;
        this.goalTaskRepository = goalTaskRepository;
        this.goalRepository = goalRepository;
        this.fileStorageService = fileStorageService;
    }

    @Override
    @Transactional
    public CheckInDTO startCheckIn(Long userId, CheckInDTO.StartRequest request) {
        TaskInstance instance = instanceRepository.findById(request.getTaskInstanceId())
                .orElseThrow(() -> new EntityNotFoundException("任务实例不存在"));

        List<CheckInRecord> orphans = recordRepository
                .findByTaskInstanceIdAndEndTimeIsNull(request.getTaskInstanceId());
        for (CheckInRecord orphan : orphans) {
            orphan.setEndTime(LocalDateTime.now());
            recordRepository.save(orphan);
        }

        instance.setStatus(TaskInstanceStatus.IN_PROGRESS);
        instanceRepository.save(instance);

        CheckInRecord record = new CheckInRecord();
        record.setTaskInstanceId(instance.getId());
        record.setUserId(userId);
        record.setStartTime(LocalDateTime.now());
        record.setCheckInType(CheckInType.REALTIME);
        record = recordRepository.save(record);

        return toDTO(record);
    }

    @Override
    @Transactional
    public CheckInDTO endCheckIn(Long userId, CheckInDTO.EndRequest request, List<MultipartFile> images) {
        CheckInRecord record = recordRepository.findById(request.getRecordId())
                .orElseThrow(() -> new EntityNotFoundException("打卡记录不存在"));

        if (request.getDurationSeconds() != null && record.getStartTime() != null) {
            record.setEndTime(record.getStartTime().plusSeconds(request.getDurationSeconds()));
            record.setDurationMinutes((int) Math.ceil(request.getDurationSeconds() / 60.0));
        } else {
            record.setEndTime(LocalDateTime.now());
            if (record.getStartTime() != null) {
                long minutes = Duration.between(record.getStartTime(), record.getEndTime()).toMinutes();
                record.setDurationMinutes((int) minutes);
            }
        }
        if (request.getContent() != null) record.setContent(request.getContent());
        if (request.getNote() != null) record.setNote(request.getNote());
        record = recordRepository.save(record);

        TaskInstance instance = instanceRepository.findById(record.getTaskInstanceId())
                .orElseThrow(() -> new EntityNotFoundException("任务实例不存在"));
        if (request.isComplete()) {
            instance.setStatus(TaskInstanceStatus.COMPLETED);
            instanceRepository.save(instance);
            autoCompleteTaskIfOneTime(instance.getTaskId());
        }

        if (images != null && !images.isEmpty()) {
            saveImages(record.getId(), images);
        }

        return toDTO(record);
    }

    @Override
    @Transactional
    public CheckInDTO manualCheckIn(Long userId, CheckInDTO.ManualRequest request, List<MultipartFile> images) {
        TaskInstance instance = instanceRepository.findById(request.getTaskInstanceId())
                .orElseThrow(() -> new EntityNotFoundException("任务实例不存在"));

        instance.setStatus(TaskInstanceStatus.COMPLETED);
        instanceRepository.save(instance);
        autoCompleteTaskIfOneTime(instance.getTaskId());

        CheckInRecord record = new CheckInRecord();
        record.setTaskInstanceId(instance.getId());
        record.setUserId(userId);
        record.setStartTime(request.getStartTime());
        record.setEndTime(request.getEndTime());
        record.setDurationMinutes(request.getDurationMinutes());
        record.setContent(request.getContent());
        record.setNote(request.getNote());
        record.setCheckInType(CheckInType.MANUAL);
        record = recordRepository.save(record);

        if (images != null && !images.isEmpty()) {
            saveImages(record.getId(), images);
        }

        return toDTO(record);
    }

    @Override
    public CheckInDTO getCheckInRecord(Long recordId) {
        CheckInRecord record = recordRepository.findById(recordId)
                .orElseThrow(() -> new EntityNotFoundException("打卡记录不存在"));
        return toDTO(record);
    }

    @Override
    public List<CheckInDTO> getRecordsByTaskInstance(Long taskInstanceId) {
        return recordRepository.findByTaskInstanceId(taskInstanceId).stream()
                .map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public List<CheckInDTO> getUserRecords(Long userId) {
        return recordRepository.findByUserIdOrderByStartTimeDesc(userId).stream()
                .map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public boolean hasActiveCheckIn(Long userId) {
        List<CheckInRecord> openRecords = recordRepository.findByUserIdAndEndTimeIsNull(userId);
        for (CheckInRecord r : openRecords) {
            TaskInstance inst = instanceRepository.findById(r.getTaskInstanceId()).orElse(null);
            if (inst != null && inst.getStatus() == TaskInstanceStatus.IN_PROGRESS) {
                return true;
            }
        }
        return false;
    }

    @Override
    public CheckInDTO.ActiveSessionResponse getActiveSession(Long userId) {
        List<CheckInRecord> openRecords = recordRepository.findByUserIdAndEndTimeIsNull(userId);
        if (openRecords.isEmpty()) return null;

        CheckInRecord record = null;
        TaskInstance instance = null;
        for (CheckInRecord r : openRecords) {
            TaskInstance inst = instanceRepository.findById(r.getTaskInstanceId()).orElse(null);
            if (inst != null && inst.getStatus() == TaskInstanceStatus.IN_PROGRESS) {
                record = r;
                instance = inst;
                break;
            }
        }
        if (record == null) return null;

        Task task = taskRepository.findById(instance.getTaskId()).orElse(null);

        List<CheckInRecord> allRecords = recordRepository.findByTaskInstanceId(instance.getId());
        long accumulatedSeconds = allRecords.stream()
                .filter(r -> r.getStartTime() != null && r.getEndTime() != null)
                .mapToLong(r -> {
                    long secs = Duration.between(r.getStartTime(), r.getEndTime()).toSeconds();
                    return secs > 0 ? secs : 0;
                })
                .sum();

        long elapsedSeconds = Duration.between(record.getStartTime(), LocalDateTime.now()).toSeconds();

        CheckInDTO.ActiveSessionResponse resp = new CheckInDTO.ActiveSessionResponse();
        resp.setRecordId(record.getId());
        resp.setInstanceId(instance.getId());
        resp.setTaskId(instance.getTaskId());
        resp.setTaskName(task != null ? task.getName() : "");
        resp.setStartTime(record.getStartTime());
        resp.setAccumulatedSeconds(accumulatedSeconds);
        resp.setElapsedSeconds(elapsedSeconds);
        return resp;
    }

    private void saveImages(Long recordId, List<MultipartFile> images) {
        for (MultipartFile file : images) {
            String filePath = fileStorageService.upload(file);
            CheckInImage image = new CheckInImage();
            image.setRecordId(recordId);
            image.setFilePath(filePath);
            image.setFileName(file.getOriginalFilename());
            image.setFileSize(file.getSize());
            imageRepository.save(image);
        }
    }

    private CheckInDTO toDTO(CheckInRecord record) {
        CheckInDTO dto = new CheckInDTO();
        dto.setId(record.getId());
        dto.setTaskInstanceId(record.getTaskInstanceId());
        dto.setStartTime(record.getStartTime());
        dto.setEndTime(record.getEndTime());
        dto.setDurationMinutes(record.getDurationMinutes());
        dto.setContent(record.getContent());
        dto.setNote(record.getNote());
        dto.setCheckInType(record.getCheckInType());

        TaskInstance instance = instanceRepository.findById(record.getTaskInstanceId()).orElse(null);
        if (instance != null) {
            dto.setTaskId(instance.getTaskId());
            Task task = taskRepository.findById(instance.getTaskId()).orElse(null);
            if (task != null) {
                dto.setTaskName(task.getName());
            }
        }

        List<String> imageUrls = imageRepository.findByRecordId(record.getId()).stream()
                .map(CheckInImage::getFilePath)
                .collect(Collectors.toList());
        dto.setImageUrls(imageUrls);

        return dto;
    }

    private void autoCompleteTaskIfOneTime(Long taskId) {
        Task task = taskRepository.findById(taskId).orElse(null);
        if (task == null || task.getRepeatRule() == null || task.getRepeatRule() != RepeatRule.NONE) {
            return;
        }
        List<TaskInstance> instances = instanceRepository.findByTaskId(taskId);
        if (instances.isEmpty()) {
            return;
        }
        boolean allCompleted = instances.stream()
                .allMatch(i -> i.getStatus() == TaskInstanceStatus.COMPLETED);
        if (allCompleted) {
            task.setStatus(TaskStatus.COMPLETED);
            taskRepository.save(task);
        }
    }
}
