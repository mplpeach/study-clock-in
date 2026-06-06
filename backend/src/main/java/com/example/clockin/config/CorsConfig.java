package com.example.clockin.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

/**
 * 跨域资源共享（CORS）配置。
 *
 * 前端运行在 localhost:5173，后端在 localhost:8080，
 * 浏览器同源策略禁止不同端口间的 AJAX 请求，
 * 这个配置让后端在响应头中声明允许哪些来源跨域访问。
 */
@Configuration
public class CorsConfig {

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();

        // 允许任意来源（生产环境应改为具体域名）
        config.addAllowedOriginPattern("*");

        // 允许所有 HTTP 方法
        config.addAllowedMethod("*");

        // 允许所有自定义请求头
        config.addAllowedHeader("*");

        // 允许携带 Cookie
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        // 对所有 URL 路径生效
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}
