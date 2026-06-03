package com.example.clockin.service.impl;

import com.example.clockin.config.FileStorageConfig;
import com.example.clockin.service.FileStorageService;
import jakarta.annotation.PostConstruct;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
@ConditionalOnProperty(name = "file.storage.type", havingValue = "local", matchIfMissing = true)
public class LocalFileStorageService implements FileStorageService {

    private final FileStorageConfig config;
    private Path uploadDir;

    public LocalFileStorageService(FileStorageConfig config) {
        this.config = config;
    }

    @PostConstruct
    public void init() {
        uploadDir = Paths.get(config.getLocal().getUploadDir()).toAbsolutePath().normalize();
        try {
            Files.createDirectories(uploadDir);
        } catch (IOException e) {
            throw new RuntimeException("Could not create upload directory: " + uploadDir, e);
        }
    }

    @Override
    public String upload(MultipartFile file) {
        String originalName = file.getOriginalFilename();
        String ext = "";
        if (originalName != null && originalName.contains(".")) {
            ext = originalName.substring(originalName.lastIndexOf("."));
        }
        String uniqueName = UUID.randomUUID().toString() + ext;

        try {
            Path target = uploadDir.resolve(uniqueName);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            return config.getLocal().getAccessPrefix() + "/" + uniqueName;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file: " + originalName, e);
        }
    }

    @Override
    public void delete(String filePath) {
        String fileName = filePath.substring(filePath.lastIndexOf("/") + 1);
        Path target = uploadDir.resolve(fileName);
        try {
            Files.deleteIfExists(target);
        } catch (IOException e) {
            throw new RuntimeException("Failed to delete file: " + filePath, e);
        }
    }

    @Override
    public Resource loadAsResource(String filePath) {
        String fileName = filePath.substring(filePath.lastIndexOf("/") + 1);
        Path file = uploadDir.resolve(fileName);
        if (Files.exists(file)) {
            return new FileSystemResource(file);
        }
        return null;
    }
}
