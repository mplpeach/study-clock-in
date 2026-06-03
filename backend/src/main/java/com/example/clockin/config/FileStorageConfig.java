package com.example.clockin.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "file.storage")
public class FileStorageConfig {
    private String type = "local";

    private LocalConfig local = new LocalConfig();

    @Getter
    @Setter
    public static class LocalConfig {
        private String uploadDir;
        private String accessPrefix = "/uploads";
    }
}
