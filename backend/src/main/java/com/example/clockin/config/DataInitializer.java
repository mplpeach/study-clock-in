package com.example.clockin.config;

import com.example.clockin.entity.User;
import com.example.clockin.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;

    public DataInitializer(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public void run(String... args) {
        if (userRepository.findByUsername("default").isEmpty()) {
            User user = new User();
            user.setUsername("default");
            user.setNickname("学习小达人");
            user.setEnabled(true);
            userRepository.save(user);
        }
    }
}
