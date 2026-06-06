package com.example.clockin.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * 静态资源映射配置。
 *
 * 打卡上传的图片保存在本地磁盘（如 ~/study-clock-in/uploads/），
 * 但浏览器需要通过 URL 才能访问它们。
 * 这个配置把 URL 路径 /uploads/** 映射到磁盘上的实际目录，
 * 相当于一条"虚拟路径 → 真实路径"的翻译规则。
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final FileStorageConfig config;

    public WebConfig(FileStorageConfig config) {
        this.config = config;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 只在本地存储模式下注册映射（云存储不需要）
        if ("local".equals(config.getType())) {
            String uploadPath = config.getLocal().getUploadDir();
            if (!uploadPath.endsWith("/")) {
                uploadPath += "/";
            }
            // 例如：URL /uploads/abc.jpg → 磁盘 ~/study-clock-in/uploads/abc.jpg
            registry.addResourceHandler(config.getLocal().getAccessPrefix() + "/**")
                    .addResourceLocations("file:" + uploadPath);
        }
    }
}
