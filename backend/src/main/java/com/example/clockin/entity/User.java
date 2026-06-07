package com.example.clockin.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Comment;

@Getter
@Setter
@Entity
@Comment("用户表")
@Table(name = "users")
public class User extends BaseEntity {

    @Comment("用户名")
    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Comment("密码")
    @Column(length = 255)
    private String password;

    @Comment("昵称")
    @Column(length = 50)
    private String nickname;

    @Comment("头像URL")
    @Column(length = 500)
    private String avatar;

    @Comment("是否启用")
    @Column(nullable = false)
    private Boolean enabled = true;
}
