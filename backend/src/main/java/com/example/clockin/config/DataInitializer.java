package com.example.clockin.config;

import com.example.clockin.entity.User;
import com.example.clockin.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * 应用启动时的数据初始化。
 *
 * 当前项目还没有登录功能，所有操作都硬编码 userId=1。
 * 这个类确保数据库里至少有一个默认用户作为"操作主体"。
 *
 * CommandLineRunner 会在所有 Spring Bean 初始化完成后、
 * 应用正式接受请求之前执行 run() 方法，适合做种子数据插入。
 */
@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;

    public DataInitializer(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public void run(String... args) {
        // 如果没有默认用户就建一个，有的话跳过（幂等）
        if (userRepository.findByUsername("default").isEmpty()) {
            User user = new User();
            user.setUsername("default");
            user.setNickname("学习小达人");
            user.setEnabled(true);
            userRepository.save(user);
        }
    }
}
