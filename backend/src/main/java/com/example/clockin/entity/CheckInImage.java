package com.example.clockin.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Comment;

@Getter
@Setter
@Entity
@Comment("打卡图片表")
@Table(name = "check_in_images")
public class CheckInImage extends BaseEntity {

    @Comment("打卡记录ID")
    @Column(nullable = false)
    private Long recordId;

    @Comment("文件路径")
    @Column(nullable = false, length = 500)
    private String filePath;

    @Comment("文件名")
    @Column(length = 200)
    private String fileName;

    @Comment("文件大小(字节)")
    private Long fileSize;
}
