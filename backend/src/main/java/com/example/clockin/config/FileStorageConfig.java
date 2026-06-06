package com.example.clockin.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * 文件存储配置 —— 自动绑定 application.yml 中 file.storage.* 的值。
 *
 * 用 @ConfigurationProperties 而非 @Value 的原因：
 * @Value 只能注入单个值，嵌套配置（local.uploadDir）需要手动拼，
 * @ConfigurationProperties 可以把整个前缀下的 YAML 结构自动映射到对象树。
 *
 * 对应的 YAML：
 * file:
 *   storage:
 *     type: local
 *     local:
 *       upload-dir: ${user.home}/study-clock-in/uploads
 *       access-prefix: /uploads
 */
@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "file.storage")
public class FileStorageConfig {

    /** 存储类型：local / oss / s3，默认 local */
    private String type = "local";

    /** 本地存储的详细配置 */
    private LocalConfig local = new LocalConfig();

    @Getter
    @Setter
    public static class LocalConfig {
        /** 文件保存在磁盘上的目录 */
        private String uploadDir;
        /** 对外暴露的 URL 前缀 */
        private String accessPrefix = "/uploads";
    }
}
