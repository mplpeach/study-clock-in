package com.example.clockin.service;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface FileStorageService {
    /**
     * 上传文件，返回可访问的文件路径
     */
    String upload(MultipartFile file);

    /**
     * 删除文件
     */
    void delete(String filePath);

    /**
     * 获取文件资源
     */
    Resource loadAsResource(String filePath);
}
