package com.example.clockin.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "users")
public class User extends BaseEntity {

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(length = 255)
    private String password;

    @Column(length = 50)
    private String nickname;

    @Column(length = 500)
    private String avatar;

    @Column(nullable = false)
    private Boolean enabled = true;
}
