package com.example.clockin.config;

import com.example.clockin.service.FileStorageService;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final FileStorageConfig config;

    public WebConfig(FileStorageConfig config) {
        this.config = config;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        if ("local".equals(config.getType())) {
            String uploadPath = config.getLocal().getUploadDir();
            if (!uploadPath.endsWith("/")) {
                uploadPath += "/";
            }
            registry.addResourceHandler(config.getLocal().getAccessPrefix() + "/**")
                    .addResourceLocations("file:" + uploadPath);
        }
    }
}
