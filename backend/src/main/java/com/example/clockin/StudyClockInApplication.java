package com.example.clockin;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class StudyClockInApplication {
    public static void main(String[] args) {
        SpringApplication.run(StudyClockInApplication.class, args);
    }
}
